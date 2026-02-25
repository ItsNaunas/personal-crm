import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';

interface RetentionPayload {
  clientId: string;
  leadName: string;
  email: string;
}

@Injectable()
export class TriggerReferralHandler implements JobHandler {
  readonly jobType = JobType.TRIGGER_REFERRAL;
  private readonly logger = new Logger(TriggerReferralHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { clientId, leadName, email } = job.payload as RetentionPayload;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { referralPromptSentAt: true },
    });

    if (!client || client.referralPromptSentAt) {
      this.logger.debug(`Referral prompt already sent or client not found — skipping ${clientId}`);
      return;
    }

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('referral' as never),
      { clientId, leadName, email, action: 'send_referral_prompt' },
    );

    await this.prisma.client.update({
      where: { id: clientId },
      data: { referralPromptSentAt: new Date() },
    });

    this.logger.log(`Referral prompt triggered for client ${clientId} (${leadName})`);
  }
}
