import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { LeadPriority } from '@prisma/client';
import {
  getEscalateHighDays,
  getEscalateCriticalDays,
} from '../../leads/lead-next-action.constant';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AutoPriorityHandler implements JobHandler {
  readonly jobType = JobType.AUTO_PRIORITY_CHECK;
  private readonly logger = new Logger(AutoPriorityHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(job: RawJob): Promise<void> {
    const jobOrgId = job.org_id;
    const now = new Date();

    // System cron tasks (no orgId) run with orgId 'system'; run for every org that has leads
    const orgIds =
      jobOrgId === 'system'
        ? await this.prisma.lead.findMany({ select: { orgId: true }, distinct: ['orgId'] }).then((r) => r.map((x) => x.orgId))
        : [jobOrgId];

    let totalHigh = 0;
    let totalCritical = 0;

    for (const orgId of orgIds) {
      const { highCount, criticalCount } = await this.runForOrg(orgId, now);
      totalHigh += highCount;
      totalCritical += criticalCount;
    }

    if (orgIds.length > 0) {
      this.logger.log(
        `Auto-priority: ${orgIds.length} org(s), escalated ${totalHigh} to high, ${totalCritical} to critical`,
      );
    }
  }

  private async runForOrg(orgId: string, now: Date): Promise<{ highCount: number; criticalCount: number }> {
    const leads = await this.prisma.lead.findMany({
      where: {
        orgId,
        lifecycleStage: { notIn: ['won', 'lost'] },
        nextAction: { not: null },
        nextActionDue: { not: null, lt: now },
      },
      select: {
        id: true,
        name: true,
        platform: true,
        nextActionDue: true,
        priority: true,
      },
    });

    let highCount = 0;
    let criticalCount = 0;

    for (const lead of leads) {
      const due = lead.nextActionDue!;
      const daysOverdue = (now.getTime() - due.getTime()) / MS_PER_DAY;
      const highDays = getEscalateHighDays(lead.platform);
      const criticalDays = getEscalateCriticalDays(lead.platform);

      let newPriority: LeadPriority;
      if (daysOverdue >= criticalDays) {
        newPriority = 'critical';
        criticalCount++;
      } else if (daysOverdue >= highDays) {
        newPriority = 'high';
        highCount++;
      } else {
        continue;
      }

      if (lead.priority === newPriority) continue;

      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { priority: newPriority },
      });
    }

    return { highCount, criticalCount };
  }
}
