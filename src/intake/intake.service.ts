import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../core/database/prisma.service';
import { JobsService } from '../core/jobs/jobs.service';
import { JobType } from '../core/jobs/job-types.enum';
import { IntakeSource, Prisma } from '@prisma/client';

export interface IntakeResult {
  accepted: number;
  duplicates: number;
  errors: number;
  ids: string[];
}

@Injectable()
export class IntakeService {
  private readonly logger = new Logger(IntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  async submitBatch(
    orgId: string,
    leads: Record<string, unknown>[],
    source: IntakeSource,
  ): Promise<IntakeResult> {
    const result: IntakeResult = { accepted: 0, duplicates: 0, errors: 0, ids: [] };

    for (const lead of leads) {
      try {
        const id = await this.submitSingle(orgId, lead, source);
        if (id) {
          result.accepted++;
          result.ids.push(id);
        } else {
          result.duplicates++;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Intake error for lead ${JSON.stringify(lead)}: ${message}`);
        result.errors++;
      }
    }

    this.logger.log(`Intake batch: ${result.accepted} accepted, ${result.duplicates} duplicates, ${result.errors} errors`);
    return result;
  }

  async submitSingle(
    orgId: string,
    rawPayload: Record<string, unknown>,
    source: IntakeSource,
  ): Promise<string | null> {
    const fingerprint = this.generateFingerprint(orgId, rawPayload);

    const existing = await this.prisma.leadIntakeRaw.findFirst({
      where: { orgId, fingerprint, processed: false },
      select: { id: true },
    });

    if (existing) {
      this.logger.debug(`Duplicate intake detected (fingerprint: ${fingerprint})`);
      return null;
    }

    const intake = await this.prisma.leadIntakeRaw.create({
      data: {
        orgId,
        rawPayload: rawPayload as Prisma.InputJsonValue,
        source,
        fingerprint,
      },
    });

    await this.jobsService.enqueue({
      orgId,
      jobType: JobType.PROCESS_INTAKE,
      payload: { intakeId: intake.id, orgId },
      idempotencyKey: `process_intake:${intake.id}`,
    });

    return intake.id;
  }

  private generateFingerprint(orgId: string, payload: Record<string, unknown>): string {
    const key = [
      orgId,
      (payload.email as string ?? '').toLowerCase().trim(),
      (payload.domain as string ?? '').toLowerCase().trim(),
      (payload.profile_link as string ?? '').toLowerCase().trim(),
    ].join('|');
    return createHash('sha256').update(key).digest('hex');
  }
}
