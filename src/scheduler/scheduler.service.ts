import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { SystemLogService } from '../system-log/system-log.service';
import * as cronParser from 'cron-parser';
import { Prisma } from '@prisma/client';

const CRON_TASK_EVENT_MAP: Record<string, EventType> = {
  deal_decay_check: EventType.SCHEDULER_DEAL_DECAY_CHECK,
  lead_stale_check: EventType.SCHEDULER_LEAD_STALE_CHECK,
  auto_priority_check: EventType.SCHEDULER_AUTO_PRIORITY_CHECK,
  ghost_risk_recalc: EventType.SCHEDULER_GHOST_RISK_RECALC,
  renewal_reminder: EventType.SCHEDULER_RENEWAL_REMINDER,
  weekly_ai_report: EventType.SCHEDULER_WEEKLY_AI_REPORT,
  integrity_watchdog: EventType.SCHEDULER_INTEGRITY_WATCHDOG,
};

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private isRunning = false;
  private readonly pollIntervalMs: number;
  private readonly schedulerEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly systemLog: SystemLogService,
    private readonly config: ConfigService,
  ) {
    this.schedulerEnabled = this.config.get<boolean>('scheduler.enabled') ?? true;
    this.pollIntervalMs = this.config.get<number>('scheduler.pollIntervalMs') ?? 60_000;
  }

  onModuleInit() {
    if (!this.schedulerEnabled) {
      this.logger.warn('Scheduler disabled via SCHEDULER_ENABLED=false');
      return;
    }

    this.isRunning = true;
    this.runSchedulerLoop().catch((err: Error) =>
      this.logger.error(`Scheduler loop crashed: ${err.message}`, err.stack),
    );
    this.logger.log('Scheduler started');
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('Scheduler stopped');
  }

  private async runSchedulerLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processCronTasks();
        await this.processOneOffTasks();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Scheduler error: ${message}`);
        await this.systemLog.error('SchedulerService', `Scheduler error: ${message}`);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  private async processCronTasks(): Promise<void> {
    const dueTasks = await this.prisma.cronTask.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
      },
    });

    for (const task of dueTasks) {
      const eventType = CRON_TASK_EVENT_MAP[task.taskType];
      if (!eventType) {
        this.logger.warn(`Unknown cron task type: ${task.taskType}`);
        continue;
      }

      const config = task.config as Record<string, unknown> | null;
      const orgId = task.orgId ?? (config?.orgId as string | undefined) ?? 'system';

      try {
        await this.emitter.emit({
          orgId,
          eventType,
          payload: { taskType: task.taskType, taskId: task.id },
        });

        const nextRunAt = this.computeNextRun(task.cronExpression);
        await this.prisma.cronTask.update({
          where: { id: task.id },
          data: { lastRunAt: new Date(), nextRunAt },
        });

        this.logger.debug(`Cron task fired: ${task.taskType}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Cron task ${task.taskType} failed: ${message}`);
        await this.systemLog.error('SchedulerService', `Cron task failed: ${task.taskType}`, { error: message });
        // Do not update nextRunAt so the task stays due and will retry next poll
      }
    }
  }

  private async processOneOffTasks(): Promise<void> {
    const dueTasks = await this.prisma.scheduledTask.findMany({
      where: {
        executed: false,
        executeAt: { lte: new Date() },
      },
    });

    for (const task of dueTasks) {
      const eventType = CRON_TASK_EVENT_MAP[task.taskType];
      if (!eventType) {
        this.logger.warn(`Unknown scheduled task type: ${task.taskType}`);
        await this.prisma.scheduledTask.update({ where: { id: task.id }, data: { executed: true } });
        continue;
      }

      try {
        await this.prisma.scheduledTask.update({ where: { id: task.id }, data: { executed: true } });

        const config = task.config as Record<string, unknown> | null;
        const orgId = task.orgId ?? (config?.orgId as string | undefined) ?? 'system';

        await this.emitter.emit({
          orgId,
          eventType,
          payload: { taskType: task.taskType, taskId: task.id, config },
          idempotencyKey: `scheduled_task:${task.id}`,
        });

        this.logger.debug(`One-off task fired: ${task.taskType} [${task.id}]`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`One-off task ${task.id} failed: ${message}`);
        await this.prisma.scheduledTask.update({ where: { id: task.id }, data: { executed: false } });
      }
    }
  }

  async scheduleOneOff(taskType: string, executeAt: Date, config?: Record<string, unknown>, orgId?: string): Promise<string> {
    const task = await this.prisma.scheduledTask.create({
      data: { taskType, executeAt, config: config as Prisma.InputJsonValue | undefined, orgId },
    });
    return task.id;
  }

  private computeNextRun(expression: string): Date {
    const interval = cronParser.parseExpression(expression, { currentDate: new Date() });
    return interval.next().toDate();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
