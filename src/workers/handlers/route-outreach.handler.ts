import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { WebhookService } from '../../webhook/webhook.service';
import { Prisma } from '@prisma/client';

interface RouteOutreachPayload {
  leadId: string;
}

@Injectable()
export class RouteOutreachHandler implements JobHandler {
  readonly jobType = JobType.ROUTE_OUTREACH;
  private readonly logger = new Logger(RouteOutreachHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { leadId } = job.payload as RouteOutreachPayload;

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        platform: true,
        profileLink: true,
        recommendedPath: true,
        qualificationScore: true,
        temperature: true,
        estimatedMonthlyRevenueLeak: true,
        interestProfile: true,
      },
    });

    const basePayload = {
      leadId: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      platform: lead.platform,
      profileLink: lead.profileLink,
      qualificationScore: lead.qualificationScore,
      temperature: lead.temperature,
      estimatedMonthlyRevenueLeak: lead.estimatedMonthlyRevenueLeak,
      interestProfile: lead.interestProfile as Record<string, unknown>,
    };

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        lastStateChange: new Date(),
        nextAction: this.resolveNextAction(lead.recommendedPath),
        nextActionDue: this.resolveNextActionDue(),
      } as Prisma.LeadUpdateInput,
    });

    switch (lead.recommendedPath) {
      case 'direct_call':
        await this.webhook.trigger(
          this.webhook.getWebhookUrl('outreachDirectCall' as never),
          { ...basePayload, action: 'send_booking_link' },
        );
        this.logger.log(`Lead ${leadId} (${lead.name}) routed to direct call — booking link triggered`);
        break;

      case 'outreach':
        await this.webhook.trigger(
          this.webhook.getWebhookUrl('outreachCold' as never),
          { ...basePayload, action: 'queue_cold_outreach' },
        );
        this.logger.log(`Lead ${leadId} (${lead.name}) queued for cold outreach`);
        break;

      case 'nurture':
        await this.webhook.trigger(
          this.webhook.getWebhookUrl('nurture' as never),
          { ...basePayload, action: 'add_to_nurture_sequence' },
        );
        this.logger.log(`Lead ${leadId} (${lead.name}) added to nurture sequence`);
        break;

      case 'ignore':
        this.logger.debug(`Lead ${leadId} path is ignore — no outreach`);
        break;

      default:
        this.logger.warn(`Lead ${leadId} has no recommended path — skipping routing`);
    }
  }

  private resolveNextAction(path: string | null | undefined) {
    switch (path) {
      case 'direct_call': return 'schedule_call';
      case 'outreach': return 'contact';
      case 'nurture': return 'follow_up';
      default: return 'no_action';
    }
  }

  private resolveNextActionDue(): Date {
    const due = new Date();
    due.setHours(due.getHours() + 24);
    return due;
  }
}
