import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { AIService } from '../../ai/ai.service';
import { SystemLogService } from '../../system-log/system-log.service';

@Injectable()
export class GenerateWeeklyReportHandler implements JobHandler {
  readonly jobType = JobType.GENERATE_WEEKLY_REPORT;
  private readonly logger = new Logger(GenerateWeeklyReportHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const orgId = job.org_id;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [leadsAdded, qualifiedLeads, activeDeal, failedJobs] = await Promise.all([
      this.prisma.lead.count({ where: { orgId, createdAt: { gte: weekAgo } } }),
      this.prisma.lead.count({ where: { orgId, lifecycleStage: 'qualified', createdAt: { gte: weekAgo } } }),
      this.prisma.deal.findMany({
        where: { orgId, stage: { notIn: ['won', 'lost'] } },
        select: { dealValue: true, probability: true, stage: true, stageLastChangedAt: true },
      }),
      this.prisma.job.count({ where: { orgId, status: 'failed', createdAt: { gte: weekAgo } } }),
    ]);

    const pipelineValue = activeDeal.reduce((sum, d) => sum + d.dealValue * d.probability, 0);
    const totalPipeline = activeDeal.reduce((sum, d) => sum + d.dealValue, 0);

    const stuckDeals = activeDeal
      .filter((d) => {
        if (!d.stageLastChangedAt) return false;
        const daysStuck = (Date.now() - d.stageLastChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysStuck > 14;
      })
      .map((d) => `${d.stage}: $${d.dealValue}`);

    const reportData = {
      orgId,
      period: `${weekAgo.toDateString()} — ${new Date().toDateString()}`,
      leadsAdded,
      qualifiedLeads,
      qualifiedPercent: leadsAdded > 0 ? Math.round((qualifiedLeads / leadsAdded) * 100) : 0,
      activeDealCount: activeDeal.length,
      pipelineValue,
      totalPipeline,
      stuckDeals,
      failedJobs,
    };

    try {
      const report = await this.aiService.generateExecutiveReport(reportData as Record<string, unknown>);
      await this.systemLog.info('GenerateWeeklyReportHandler', 'Weekly AI executive report generated', {
        orgId,
        report: report as unknown as Record<string, unknown>,
      });
      this.logger.log(`Weekly report generated for org ${orgId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Weekly report AI call failed: ${message}`);
      await this.systemLog.info('GenerateWeeklyReportHandler', 'Weekly report (no AI)', {
        orgId,
        data: reportData as unknown as Record<string, unknown>,
      });
    }
  }
}
