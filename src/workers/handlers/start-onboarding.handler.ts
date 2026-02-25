import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { EventType } from '../../core/events/event-types.enum';
import { OnboardingStatus, DeliveryPhase } from '@prisma/client';

interface StartOnboardingPayload {
  clientId: string;
}

// Lifecycle install engagement is 90 days — renewal at end of engagement
const ENGAGEMENT_DAYS = 90;
const TESTIMONIAL_DELAY_DAYS = 30;
const REFERRAL_DELAY_DAYS = 60;
const UPSELL_DELAY_DAYS = 90;

@Injectable()
export class StartOnboardingHandler implements JobHandler {
  readonly jobType = JobType.START_ONBOARDING;
  private readonly logger = new Logger(StartOnboardingHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { clientId } = job.payload as StartOnboardingPayload;

    const client = await this.prisma.client.findUniqueOrThrow({
      where: { id: clientId },
      include: {
        lead: {
          select: {
            name: true,
            email: true,
            companyName: true,
            interestProfile: true,
            estimatedMonthlyRevenueLeak: true,
          },
        },
        deal: {
          select: { dealValue: true, offerType: true },
        },
      },
    });

    const now = new Date();
    const renewalDate = addDays(now, ENGAGEMENT_DAYS);

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        onboardingStatus: OnboardingStatus.in_progress,
        deliveryPhase: DeliveryPhase.system_design,
        renewalDate,
      },
    });

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('onboarding' as never),
      {
        clientId,
        leadName: client.lead.name,
        email: client.lead.email,
        companyName: client.lead.companyName,
        dealValue: client.deal.dealValue,
        offerType: client.deal.offerType,
        renewalDate: renewalDate.toISOString(),
        interestProfile: client.lead.interestProfile,
        actions: [
          'create_client_folder',
          'send_welcome_email',
          'create_delivery_dashboard',
          'send_internal_checklist',
          'start_delivery_tracker',
        ],
      },
    );

    await this.prisma.scheduledTask.createMany({
      data: [
        {
          orgId: job.org_id,
          taskType: EventType.TESTIMONIAL_DUE,
          executeAt: addDays(now, TESTIMONIAL_DELAY_DAYS),
          config: { clientId, leadName: client.lead.name, email: client.lead.email },
        },
        {
          orgId: job.org_id,
          taskType: EventType.REFERRAL_DUE,
          executeAt: addDays(now, REFERRAL_DELAY_DAYS),
          config: { clientId, leadName: client.lead.name, email: client.lead.email },
        },
        {
          orgId: job.org_id,
          taskType: EventType.UPSELL_DUE,
          executeAt: addDays(now, UPSELL_DELAY_DAYS),
          config: { clientId, leadName: client.lead.name, email: client.lead.email, dealValue: client.deal.dealValue },
        },
      ],
    });

    this.logger.log(
      `Onboarding started for client ${clientId} (${client.lead.name}) — renewal: ${renewalDate.toDateString()}`,
    );
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
