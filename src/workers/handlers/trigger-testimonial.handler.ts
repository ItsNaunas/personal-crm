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
export class TriggerTestimonialHandler implements JobHandler {
  readonly jobType = JobType.TRIGGER_TESTIMONIAL;
  private readonly logger = new Logger(TriggerTestimonialHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { clientId, leadName, email } = job.payload as RetentionPayload;

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { testimonialSentAt: true, deliveryPhase: true },
    });

    if (!client || client.testimonialSentAt) {
      this.logger.debug(`Testimonial already sent or client not found — skipping ${clientId}`);
      return;
    }

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('testimonial' as never),
      { clientId, leadName, email, action: 'request_testimonial' },
    );

    await this.prisma.client.update({
      where: { id: clientId },
      data: { testimonialSentAt: new Date() },
    });

    this.logger.log(`Testimonial request triggered for client ${clientId} (${leadName})`);
  }
}
