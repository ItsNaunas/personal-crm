import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

interface HandleStaleLead {
  leadId: string;
  lastStateChange?: string;
}

const FOLLOW_UP_DAYS = 3;

@Injectable()
export class HandleStaleLeadHandler implements JobHandler {
  readonly jobType = JobType.HANDLE_STALE_LEAD;
  private readonly logger = new Logger(HandleStaleLeadHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId } = job.payload as HandleStaleLead;

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        platform: true,
        lifecycleStage: true,
        priority: true,
        lastStateChange: true,
        nextAction: true,
      },
    });

    const now = new Date();
    const nextActionDue = new Date(now);
    nextActionDue.setDate(nextActionDue.getDate() + FOLLOW_UP_DAYS);

    // Bump to high priority unless already critical
    const newPriority = lead.priority === 'critical' ? 'critical' : 'high';

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        priority: newPriority,
        nextAction: 'follow_up',
        nextActionDue,
      },
    });

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('leads' as never),
      {
        action: 'stale_lead_flagged',
        leadId,
        name: lead.name,
        email: lead.email,
        companyName: lead.companyName,
        platform: lead.platform,
        lifecycleStage: lead.lifecycleStage,
        prioritySet: newPriority,
        lastStateChange: lead.lastStateChange,
        nextActionDue: nextActionDue.toISOString(),
      },
    );

    this.logger.log(`Stale lead handled: ${leadId} (${lead.name}) — priority: ${newPriority}, follow-up in ${FOLLOW_UP_DAYS} days`);
  }
}
