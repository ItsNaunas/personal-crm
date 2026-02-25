import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

interface NudgeDealPayload {
  dealId: string;
}

@Injectable()
export class NudgeDealHandler implements JobHandler {
  readonly jobType = JobType.NUDGE_DEAL;
  private readonly logger = new Logger(NudgeDealHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId } = job.payload as NudgeDealPayload;

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: {
        lead: { select: { id: true, name: true, email: true, companyName: true } },
      },
    });

    const daysSinceLastChange = deal.stageLastChangedAt
      ? Math.floor((Date.now() - deal.stageLastChangedAt.getTime()) / 86_400_000)
      : null;

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('deals' as never),
      {
        action: 'deal_stalled',
        dealId,
        leadId: deal.leadId,
        leadName: deal.lead.name,
        email: deal.lead.email,
        companyName: deal.lead.companyName,
        stage: deal.stage,
        offerType: deal.offerType,
        dealValue: deal.dealValue,
        daysSinceLastChange,
      },
    );

    this.logger.log(`Stalled deal nudge sent for ${dealId} (${deal.lead.name}) — ${daysSinceLastChange ?? '?'} days in ${deal.stage}`);
  }
}
