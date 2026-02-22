import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { CrmEventEmitter } from '../../core/events/crm-event-emitter.service';
import { EventType } from '../../core/events/event-types.enum';

const STALE_DAYS = 30;

@Injectable()
export class CheckLeadStaleHandler implements JobHandler {
  readonly jobType = JobType.CHECK_LEAD_STALE;
  private readonly logger = new Logger(CheckLeadStaleHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - STALE_DAYS);

    const staleLeads = await this.prisma.lead.findMany({
      where: {
        orgId: job.org_id,
        lifecycleStage: { notIn: ['won', 'lost'] },
        lastStateChange: { lt: threshold },
      },
      select: { id: true, lifecycleStage: true, lastStateChange: true },
    });

    for (const lead of staleLeads) {
      await this.emitter.emit({
        orgId: job.org_id,
        eventType: EventType.LEAD_STALE,
        entityType: 'lead',
        entityId: lead.id,
        payload: { leadId: lead.id, lastStateChange: lead.lastStateChange },
        idempotencyKey: `lead.stale:${lead.id}:${threshold.toDateString()}`,
      });
    }

    this.logger.log(`Lead stale check: ${staleLeads.length} stale lead(s) detected`);
  }
}
