import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { AIService } from '../../ai/ai.service';
import { CrmEventEmitter } from '../../core/events/crm-event-emitter.service';
import { EventType } from '../../core/events/event-types.enum';
import { Prisma } from '@prisma/client';

interface AnalyzeCallPayload {
  callId: string;
  leadId: string;
}

@Injectable()
export class AnalyzeCallHandler implements JobHandler {
  readonly jobType = JobType.ANALYZE_CALL;
  private readonly logger = new Logger(AnalyzeCallHandler.name);
  private readonly buyingSignalThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly emitter: CrmEventEmitter,
    private readonly config: ConfigService,
  ) {
    this.buyingSignalThreshold = this.config.get<number>('intelligence.buyingSignalThreshold') ?? 75;
  }

  async handle(job: RawJob): Promise<void> {
    const { callId, leadId } = job.payload as AnalyzeCallPayload;

    const call = await this.prisma.call.findUniqueOrThrow({ where: { id: callId } });
    if (!call.transcript) {
      this.logger.warn(`Call ${callId} has no transcript to analyze`);
      return;
    }

    const analysis = await this.aiService.summarizeCall(call.transcript);

    await this.prisma.call.update({
      where: { id: callId },
      data: {
        aiSummary: analysis.summary,
        outcome: analysis.outcome,
        buyingSignalsDetected: analysis.buyingSignals as unknown as Prisma.InputJsonValue,
      },
    });

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: { buyingSignalScore: true },
    });

    const newScore = Math.min(100, lead.buyingSignalScore + analysis.buyingSignalScore * 0.3);

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { buyingSignalScore: newScore, lastStateChange: new Date() },
    });

    if (newScore >= this.buyingSignalThreshold) {
      await this.emitter.emit({
        orgId: job.org_id,
        eventType: EventType.BUYING_SIGNAL_HIGH,
        entityType: 'lead',
        entityId: leadId,
        payload: { leadId, score: newScore, callId },
        idempotencyKey: `buying_signal.high:${leadId}:${callId}`,
      });
    }

    this.logger.log(`Call ${callId} analyzed. Buying signal score: ${newScore}`);
  }
}
