import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { EventType } from './event-types.enum';
import { EVENT_JOB_MAP } from './event-job-mapping.constant';
import { JobType } from '../jobs/job-types.enum';

export interface EmitEventParams {
  orgId: string;
  eventType: EventType;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

@Injectable()
export class CrmEventEmitter {
  private readonly logger = new Logger(CrmEventEmitter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async emit(params: EmitEventParams): Promise<string> {
    const eventId = await this.prisma.$transaction(async (tx) => {
      if (params.idempotencyKey) {
        const existing = await tx.event.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
          select: { id: true },
        });
        if (existing) {
          this.logger.debug(`Event already emitted (idempotent): ${params.eventType} / ${params.idempotencyKey}`);
          return existing.id;
        }
      }

      const event = await tx.event.create({
        data: {
          orgId: params.orgId,
          eventType: params.eventType,
          entityType: params.entityType,
          entityId: params.entityId,
          payload: params.payload as Prisma.InputJsonValue | undefined,
          metadata: params.metadata as Prisma.InputJsonValue | undefined,
          idempotencyKey: params.idempotencyKey,
        },
        select: { id: true },
      });

      const jobTypes: JobType[] = EVENT_JOB_MAP[params.eventType] ?? [];
      for (const jobType of jobTypes) {
        const idempotencyKey = `${jobType}:${event.id}`;
        try {
          await tx.job.create({
            data: {
              orgId: params.orgId,
              eventId: event.id,
              jobType,
              idempotencyKey,
              payload: params.payload as Prisma.InputJsonValue | undefined,
            },
          });
        } catch (e: unknown) {
          if (!this.isUniqueConstraintError(e)) throw e;
        }
      }

      return event.id;
    });

    this.logger.debug(`Event emitted: ${params.eventType} [${eventId}]`);
    return eventId;
  }

  private isUniqueConstraintError(e: unknown): boolean {
    return (
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'P2002'
    );
  }
}
