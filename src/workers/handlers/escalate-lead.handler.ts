import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

interface EscalateLeadPayload {
  leadId: string;
  score: number;
}

@Injectable()
export class EscalateLeadHandler implements JobHandler {
  readonly jobType = JobType.ESCALATE_LEAD;
  private readonly logger = new Logger(EscalateLeadHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId, score } = job.payload as EscalateLeadPayload;

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { name: true, email: true, lifecycleStage: true, recommendedPath: true },
    });

    if (lead.recommendedPath !== 'direct_call') {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { recommendedPath: 'direct_call', lastStateChange: new Date() },
      });
    }

    await this.systemLog.info('EscalateLeadHandler', `High buying signal — lead escalated to direct call`, {
      leadId,
      score,
      leadName: lead.name,
    });

    this.logger.log(`Lead ${leadId} escalated (buying signal score: ${score})`);
  }
}
