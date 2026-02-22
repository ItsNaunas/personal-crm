import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { CrmEventEmitter } from '../../core/events/crm-event-emitter.service';
import { EventType } from '../../core/events/event-types.enum';
import { Prisma } from '@prisma/client';
import { STAGE_NEXT_ACTION } from '../../leads/lead-next-action.constant';

const TEMPERATURE_VALUES = ['cold', 'warm', 'hot'] as const;
function parseTemperature(value: unknown): (typeof TEMPERATURE_VALUES)[number] | undefined {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return TEMPERATURE_VALUES.includes(s as (typeof TEMPERATURE_VALUES)[number]) ? (s as (typeof TEMPERATURE_VALUES)[number]) : undefined;
}

interface ProcessIntakePayload {
  intakeId: string;
  orgId: string;
}

@Injectable()
export class ProcessIntakeHandler implements JobHandler {
  readonly jobType = JobType.PROCESS_INTAKE;
  private readonly logger = new Logger(ProcessIntakeHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { intakeId, orgId } = job.payload as ProcessIntakePayload;

    const intake = await this.prisma.leadIntakeRaw.findUniqueOrThrow({ where: { id: intakeId } });

    if (intake.processed) {
      this.logger.debug(`Intake ${intakeId} already processed`);
      return;
    }

    const raw = intake.rawPayload as Record<string, unknown>;
    const email = (raw.email as string)?.trim() || undefined;
    const profileLink = (raw.profile_link as string)?.trim() || undefined;

    // Only treat as duplicate when we can match on a real identifier (email or profile_link).
    // When email is empty, the old logic matched "any lead with no email" and wrongly marked all no-email rows as duplicate.
    let existingLead: { id: string } | null = null;
    if (email) {
      existingLead = await this.prisma.lead.findFirst({
        where: { orgId, email },
        select: { id: true },
      });
    }
    if (!existingLead && profileLink) {
      existingLead = await this.prisma.lead.findFirst({
        where: { orgId, profileLink },
        select: { id: true },
      });
    }

    if (existingLead) {
      this.logger.debug(`Duplicate lead detected (email or profile_link match)`);
      await this.prisma.leadIntakeRaw.update({
        where: { id: intakeId },
        data: { duplicateFlag: true, processed: true, processedAt: new Date() },
      });
      return;
    }

    const now = new Date();
    const defaultNext = STAGE_NEXT_ACTION.new_lead;
    const nextActionDue = new Date(now);
    nextActionDue.setDate(nextActionDue.getDate() + defaultNext.dueDays);

    const lead = await this.prisma.lead.create({
      data: {
        orgId,
        name: (raw.name as string) ?? 'Unknown',
        email: raw.email as string | undefined,
        phone: raw.phone as string | undefined,
        profileLink: raw.profile_link as string | undefined,
        companyName: raw.company_name as string | undefined,
        domain: raw.domain as string | undefined,
        industry: raw.industry as string | undefined,
        location: raw.location as string | undefined,
        leadSource: (raw.lead_source as string | undefined) ?? String(intake.source),
        platform: raw.platform as string | undefined,
        temperature: parseTemperature(raw.temperature),
        lastStateChange: now,
        nextAction: defaultNext.nextAction,
        nextActionDue,
        priority: 'normal',
      },
    });

    await this.prisma.leadIntakeRaw.update({
      where: { id: intakeId },
      data: { processed: true, processedAt: new Date() },
    });

    await this.prisma.activity.create({
      data: {
        orgId,
        entityType: 'lead',
        entityId: lead.id,
        activityType: 'lead_created_from_intake',
        payload: { intakeId, source: intake.source } as Prisma.InputJsonValue,
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.LEAD_CREATED,
      entityType: 'lead',
      entityId: lead.id,
      payload: { leadId: lead.id },
      idempotencyKey: `lead.created:${lead.id}`,
    });

    this.logger.log(`Created lead ${lead.id} from intake ${intakeId}`);
  }
}
