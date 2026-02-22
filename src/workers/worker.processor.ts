import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsService } from '../core/jobs/jobs.service';
import { SystemLogService } from '../system-log/system-log.service';
import { JobHandler } from './interfaces/job-handler.interface';
import { RawJob } from '../core/jobs/raw-job.type';
import { v4 as uuidv4 } from 'uuid';

export const JOB_HANDLERS = 'JOB_HANDLERS';

@Injectable()
export class WorkerProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerProcessor.name);
  private readonly handlerRegistry = new Map<string, JobHandler>();
  private isRunning = false;
  private readonly concurrency: number;
  private readonly pollIntervalMs: number;
  private readonly workerEnabled: boolean;

  constructor(
    @Inject(JOB_HANDLERS) private readonly handlers: JobHandler[],
    private readonly jobsService: JobsService,
    private readonly systemLog: SystemLogService,
    private readonly config: ConfigService,
  ) {
    this.workerEnabled = this.config.get<boolean>('worker.enabled') ?? true;
    this.concurrency = this.config.get<number>('worker.concurrency') ?? 2;
    this.pollIntervalMs = this.config.get<number>('worker.pollIntervalMs') ?? 1000;
  }

  onModuleInit() {
    for (const handler of this.handlers) {
      this.handlerRegistry.set(handler.jobType, handler);
      this.logger.log(`Registered handler: ${handler.jobType}`);
    }

    if (!this.workerEnabled) {
      this.logger.warn('Worker disabled via WORKER_ENABLED=false');
      return;
    }

    this.isRunning = true;

    for (let i = 0; i < this.concurrency; i++) {
      const workerId = `worker-${uuidv4().slice(0, 8)}`;
      this.runWorkerLoop(workerId).catch((err: Error) =>
        this.logger.error(`Worker loop ${workerId} crashed: ${err.message}`, err.stack),
      );
    }

    this.logger.log(`Started ${this.concurrency} worker loop(s)`);

    this.runReaperLoop().catch((err: Error) =>
      this.logger.error(`Reaper loop crashed: ${err.message}`, err.stack),
    );
  }

  onModuleDestroy() {
    this.isRunning = false;
    this.logger.log('Worker processor stopping');
  }

  private async runWorkerLoop(workerId: string): Promise<void> {
    this.logger.log(`Worker ${workerId} started`);

    while (this.isRunning) {
      try {
        const job = await this.jobsService.claimNext(workerId);
        if (job) {
          await this.processJob(job, workerId);
        } else {
          await this.sleep(this.pollIntervalMs);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Worker ${workerId} error: ${message}`);
        await this.sleep(this.pollIntervalMs);
      }
    }

    this.logger.log(`Worker ${workerId} stopped`);
  }

  private async runReaperLoop(): Promise<void> {
    while (this.isRunning) {
      await this.sleep(60_000);
      try {
        await this.jobsService.reaperSweep();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Reaper error: ${message}`);
      }
    }
  }

  private async processJob(job: RawJob, workerId: string): Promise<void> {
    const handler = this.handlerRegistry.get(job.job_type);
    if (!handler) {
      this.logger.warn(`No handler for job type: ${job.job_type}`);
      await this.jobsService.fail(job.id, `No handler registered for job type: ${job.job_type}`);
      return;
    }

    this.logger.debug(`Processing job ${job.id} [${job.job_type}] on ${workerId}`);

    try {
      await handler.handle(job);
      await this.jobsService.complete(job.id);
      this.logger.debug(`Job ${job.id} completed`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Job ${job.id} [${job.job_type}] failed: ${message}`);
      await this.systemLog.error('WorkerProcessor', `Job failed: ${job.job_type}`, {
        jobId: job.id,
        error: message,
        attempt: job.attempts + 1,
      });
      await this.jobsService.fail(job.id, message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
