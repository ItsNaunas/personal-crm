import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { CrmEventEmitter } from '../../core/events/crm-event-emitter.service';
import { EventType } from '../../core/events/event-types.enum';

@Injectable()
export class CheckDealDecayHandler implements JobHandler {
  readonly jobType = JobType.CHECK_DEAL_DECAY;
  private readonly logger = new Logger(CheckDealDecayHandler.name);
  private readonly decayThresholdDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly config: ConfigService,
  ) {
    this.decayThresholdDays = this.config.get<number>('intelligence.dealDecayThresholdDays') ?? 14;
  }

  async handle(job: RawJob): Promise<void> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - this.decayThresholdDays);

    const stalledDeals = await this.prisma.deal.findMany({
      where: {
        orgId: job.org_id,
        stage: { notIn: ['won', 'lost'] },
        stageLastChangedAt: { lt: threshold },
      },
      select: { id: true, stage: true, stageLastChangedAt: true, dealValue: true },
    });

    for (const deal of stalledDeals) {
      await this.emitter.emit({
        orgId: job.org_id,
        eventType: EventType.DEAL_STALLED,
        entityType: 'deal',
        entityId: deal.id,
        payload: { dealId: deal.id, stage: deal.stage, daysSinceChange: this.decayThresholdDays },
        idempotencyKey: `deal.stalled:${deal.id}:${threshold.toDateString()}`,
      });
    }

    this.logger.log(`Deal decay check: ${stalledDeals.length} stalled deal(s) detected`);
  }
}
