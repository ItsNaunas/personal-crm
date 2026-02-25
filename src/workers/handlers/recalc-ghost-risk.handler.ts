import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

@Injectable()
export class RecalcGhostRiskHandler implements JobHandler {
  readonly jobType = JobType.RECALC_GHOST_RISK;
  private readonly logger = new Logger(RecalcGhostRiskHandler.name);
  private readonly silenceDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
    private readonly config: ConfigService,
  ) {
    this.silenceDays = this.config.get<number>('intelligence.ghostRiskSilenceDays') ?? 7;
  }

  async handle(job: RawJob): Promise<void> {
    const silenceThreshold = new Date();
    silenceThreshold.setDate(silenceThreshold.getDate() - this.silenceDays);

    // Pass 1: Leads with high buying signal that have gone silent — increment risk
    const atRiskLeads = await this.prisma.lead.findMany({
      where: {
        orgId: job.org_id,
        buyingSignalScore: { gt: 50 },
        lifecycleStage: { notIn: ['won', 'lost'] },
        lastStateChange: { lt: silenceThreshold },
      },
      select: { id: true, ghostRiskScore: true, buyingSignalScore: true },
    });

    for (const lead of atRiskLeads) {
      const newScore = Math.min(100, lead.ghostRiskScore + 10);
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { ghostRiskScore: newScore },
      });

      if (newScore >= 60) {
        await this.systemLog.warn('RecalcGhostRiskHandler', `High ghost risk: lead ${lead.id}`, {
          leadId: lead.id,
          ghostRiskScore: newScore,
          buyingSignalScore: lead.buyingSignalScore,
        });
      }
    }

    // Pass 2: Leads that re-engaged (recent state change) but still carry a ghost risk score — decay it
    const reengagedLeads = await this.prisma.lead.findMany({
      where: {
        orgId: job.org_id,
        ghostRiskScore: { gt: 0 },
        lifecycleStage: { notIn: ['won', 'lost'] },
        lastStateChange: { gte: silenceThreshold },
      },
      select: { id: true, ghostRiskScore: true },
    });

    for (const lead of reengagedLeads) {
      const decayedScore = Math.max(0, lead.ghostRiskScore - 15);
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { ghostRiskScore: decayedScore },
      });
    }

    this.logger.log(
      `Ghost risk: ${atRiskLeads.length} lead(s) incremented, ${reengagedLeads.length} lead(s) decayed`,
    );
  }
}
