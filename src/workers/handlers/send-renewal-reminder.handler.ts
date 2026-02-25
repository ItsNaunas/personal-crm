import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

@Injectable()
export class SendRenewalReminderHandler implements JobHandler {
  readonly jobType = JobType.SEND_RENEWAL_REMINDER;
  private readonly logger = new Logger(SendRenewalReminderHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const upcomingRenewals = await this.prisma.client.findMany({
      where: {
        orgId: job.org_id,
        renewalDate: { lte: thirtyDaysOut, gte: new Date() },
      },
      include: {
        lead: { select: { name: true, email: true, companyName: true } },
        deal: { select: { dealValue: true } },
      },
    });

    for (const client of upcomingRenewals) {
      await this.webhook.trigger(
        this.webhook.getWebhookUrl('renewalReminder' as never),
        {
          clientId: client.id,
          leadName: client.lead.name,
          email: client.lead.email,
          companyName: client.lead.companyName,
          renewalDate: client.renewalDate,
          dealValue: client.deal.dealValue,
          daysUntilRenewal: Math.ceil(
            ((client.renewalDate?.getTime() ?? 0) - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        },
      );
    }

    this.logger.log(`Triggered ${upcomingRenewals.length} renewal reminders`);
  }
}
