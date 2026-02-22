import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';
import { RawJob } from './raw-job.type';
import { JobType } from './job-types.enum';

export interface EnqueueOptions {
  orgId: string;
  jobType: JobType;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  eventId?: string;
  scheduledFor?: Date;
  maxAttempts?: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly baseDelayMs: number;
  private readonly lockTimeoutMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly systemLog: SystemLogService,
  ) {
    this.baseDelayMs = this.config.get<number>('job.baseDelayMs') ?? 5000;
    this.lockTimeoutMinutes = this.config.get<number>('worker.lockTimeoutMinutes') ?? 10;
  }

  async enqueue(options: EnqueueOptions): Promise<string | null> {
    try {
      const job = await this.prisma.job.create({
        data: {
          orgId: options.orgId,
          jobType: options.jobType,
          payload: options.payload as Prisma.InputJsonValue | undefined,
          idempotencyKey: options.idempotencyKey,
          eventId: options.eventId,
          scheduledFor: options.scheduledFor ?? new Date(),
          maxAttempts: options.maxAttempts ?? (this.config.get<number>('job.maxAttempts') ?? 3),
        },
        select: { id: true },
      });
      return job.id;
    } catch (e: unknown) {
      if (this.isUniqueConstraintError(e)) {
        this.logger.debug(`Duplicate job skipped: ${options.jobType} / ${options.idempotencyKey}`);
        return null;
      }
      throw e;
    }
  }

  async claimNext(workerId: string): Promise<RawJob | null> {
    return this.prisma.$transaction(async (tx) => {
      const [job] = await (tx as unknown as PrismaClient).$queryRaw<RawJob[]>(
        Prisma.sql`
          SELECT * FROM jobs
          WHERE status = 'pending'
            AND scheduled_for <= NOW()
          ORDER BY scheduled_for ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `,
      );

      if (!job) return null;

      await (tx as unknown as PrismaClient).$executeRaw(
        Prisma.sql`
          UPDATE jobs
          SET status = 'running',
              locked_at = NOW(),
              locked_by = ${workerId},
              started_at = NOW(),
              updated_at = NOW()
          WHERE id = ${job.id}
        `,
      );

      return { ...job, status: 'running', locked_by: workerId, locked_at: new Date() };
    });
  }

  async complete(jobId: string): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = await this.prisma.job.findUniqueOrThrow({ where: { id: jobId } });
    const nextAttempts = job.attempts + 1;

    if (nextAttempts >= job.maxAttempts) {
      await this.moveToDeadLetter(job, error);
      await this.systemLog.error('JobsService', `Job dead-lettered: ${job.jobType}`, {
        jobId,
        jobType: job.jobType,
        error,
      });
      return;
    }

    const backoffMs = Math.pow(2, nextAttempts) * this.baseDelayMs;
    const scheduledFor = new Date(Date.now() + backoffMs);

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        attempts: nextAttempts,
        scheduledFor,
        lockedAt: null,
        lockedBy: null,
        lastError: error,
      },
    });

    this.logger.warn(`Job ${jobId} failed (attempt ${nextAttempts}). Retry at ${scheduledFor.toISOString()}`);
  }

  async reaperSweep(): Promise<number> {
    const threshold = new Date(Date.now() - this.lockTimeoutMinutes * 60 * 1000);

    const result = await this.prisma.job.updateMany({
      where: {
        status: 'running',
        lockedAt: { lt: threshold },
      },
      data: {
        status: 'pending',
        lockedAt: null,
        lockedBy: null,
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Reaper reset ${result.count} stuck jobs`);
      await this.systemLog.warn('JobsService', `Reaper reset ${result.count} stuck jobs`, {
        threshold: threshold.toISOString(),
      });
    }

    return result.count;
  }

  private async moveToDeadLetter(job: { id: string; orgId: string; eventId: string | null; jobType: string; idempotencyKey: string | null; payload: unknown; attempts: number; maxAttempts: number }, error: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.deadLetterJob.create({
        data: {
          orgId: job.orgId,
          originalJobId: job.id,
          eventId: job.eventId,
          jobType: job.jobType,
          idempotencyKey: job.idempotencyKey,
          payload: job.payload as Prisma.InputJsonValue | undefined,
          attempts: job.attempts + 1,
          maxAttempts: job.maxAttempts,
          lastError: error,
        },
      }),
      this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          lockedAt: null,
          lockedBy: null,
          lastError: error,
          attempts: job.attempts + 1,
        },
      }),
    ]);
  }

  private isUniqueConstraintError(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'P2002'
    );
  }

  async getPendingCount(orgId?: string): Promise<number> {
    return this.prisma.job.count({
      where: { status: 'pending', ...(orgId ? { orgId } : {}) },
    });
  }

  async getFailedJobs(orgId?: string, limit = 50) {
    return this.prisma.job.findMany({
      where: { status: 'failed', ...(orgId ? { orgId } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getDeadLetterJobs(orgId?: string, limit = 50) {
    return this.prisma.deadLetterJob.findMany({
      where: { ...(orgId ? { orgId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
