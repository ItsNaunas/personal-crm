import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { AIService, CallAnalysisResult } from '../../ai/ai.service';
import { WebhookService } from '../../webhook/webhook.service';

interface GenerateProposalBlueprintPayload {
  callId: string;
  leadId: string;
  summary: string;
  outcome: string;
  buyingSignalScore: number;
  nextSteps: string[];
}

@Injectable()
export class GenerateProposalBlueprintHandler implements JobHandler {
  readonly jobType = JobType.GENERATE_PROPOSAL_BLUEPRINT;
  private readonly logger = new Logger(GenerateProposalBlueprintHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly webhook: WebhookService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { callId, leadId, summary, outcome, buyingSignalScore, nextSteps } =
      job.payload as GenerateProposalBlueprintPayload;

    const lead = await this.prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      select: {
        name: true,
        companyName: true,
        industry: true,
        revenueBand: true,
        employeeCount: true,
        interestProfile: true,
        estimatedMonthlyRevenueLeak: true,
        qualificationScore: true,
        temperature: true,
      },
    });

    const callAnalysis: CallAnalysisResult = {
      summary,
      outcome,
      buyingSignals: [],
      buyingSignalScore,
      nextSteps: nextSteps ?? [],
    };

    const blueprint = await this.aiService.generateProposalBlueprint(
      callAnalysis,
      lead as Record<string, unknown>,
    );

    await this.prisma.call.update({
      where: { id: callId },
      data: { proposalBlueprint: JSON.stringify(blueprint) },
    });

    await this.webhook.trigger(
      this.webhook.getWebhookUrl('proposalBlueprint' as never),
      {
        callId,
        leadId,
        leadName: lead.name,
        companyName: lead.companyName,
        blueprint,
      },
    );

    this.logger.log(`Proposal blueprint generated for call ${callId} — lead: ${lead.name}`);
  }
}
