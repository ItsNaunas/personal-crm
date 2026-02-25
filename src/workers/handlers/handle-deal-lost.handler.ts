import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { SystemLogService } from '../../system-log/system-log.service';

interface HandleDealLostPayload {
  dealId: string;
  reason?: string;
}

@Injectable()
export class HandleDealLostHandler implements JobHandler {
  readonly jobType = JobType.HANDLE_DEAL_LOST;
  private readonly logger = new Logger(HandleDealLostHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId, reason } = job.payload as HandleDealLostPayload;

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            platform: true,
            lifecycleStage: true,
          },
        },
      },
    });

    const lostReason = reason ?? deal.lostReason ?? 'unspecified';

    // Archive the deal exit reason and mark lead as lost
    await this.prisma.lead.update({
      where: { id: deal.leadId },
      data: {
        lifecycleStage: 'lost',
        nextAction: 'no_action',
        nextActionDue: null,
        lastStateChange: new Date(),
      },
    });

    await this.systemLog.info('HandleDealLostHandler', `Deal lost: ${dealId}`, {
      dealId,
      leadId: deal.leadId,
      leadName: deal.lead.name,
      dealValue: deal.dealValue,
      offerType: deal.offerType,
      lostReason,
    });

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('deals' as never),
      {
        action: 'deal_lost',
        dealId,
        leadId: deal.leadId,
        leadName: deal.lead.name,
        email: deal.lead.email,
        companyName: deal.lead.companyName,
        platform: deal.lead.platform,
        dealValue: deal.dealValue,
        offerType: deal.offerType,
        lostReason,
      },
    );

    this.logger.log(`Deal lost handled: ${dealId} (${deal.lead.name}) — reason: ${lostReason}`);
  }
}
