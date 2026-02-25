import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

interface UpsellPayload {
  clientId: string;
  leadName: string;
  email: string;
  dealValue: number;
}

@Injectable()
export class TriggerUpsellHandler implements JobHandler {
  readonly jobType = JobType.TRIGGER_UPSELL;
  private readonly logger = new Logger(TriggerUpsellHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { clientId, leadName, email, dealValue } = job.payload as UpsellPayload;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { upsellFlaggedAt: true, deliveryPhase: true },
    });

    if (!client || client.upsellFlaggedAt) {
      this.logger.debug(`Upsell already flagged or client not found — skipping ${clientId}`);
      return;
    }

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('upsell' as never),
      { clientId, leadName, email, dealValue, action: 'flag_upsell_opportunity' },
    );

    await this.prisma.client.update({
      where: { id: clientId },
      data: { upsellFlaggedAt: new Date() },
    });

    this.logger.log(`Upsell opportunity flagged for client ${clientId} (${leadName})`);
  }
}
