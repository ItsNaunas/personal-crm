import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

interface NudgeDealPayload {
  dealId: string;
}

@Injectable()
export class NudgeDealHandler implements JobHandler {
  readonly jobType = JobType.NUDGE_DEAL;
  private readonly logger = new Logger(NudgeDealHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId } = job.payload as NudgeDealPayload;

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: { lead: true },
    });

    // In production: trigger email/Slack notification to assigned rep.
    await this.systemLog.warn('NudgeDealHandler', `Stalled deal nudge: ${dealId}`, {
      dealId,
      stage: deal.stage,
      leadName: deal.lead.name,
      stageLastChanged: deal.stageLastChangedAt,
    });

    this.logger.log(`Nudge triggered for stalled deal ${dealId}`);
  }
}
