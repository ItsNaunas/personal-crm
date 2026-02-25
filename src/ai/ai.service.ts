import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface QualificationResult {
  qualificationScore: number;
  temperature: 'cold' | 'warm' | 'hot';
  recommendedPath: 'outreach' | 'nurture' | 'direct_call' | 'ignore';
  estimatedMonthlyRevenueLeak: number;
  reasoning: string;
  interestProfile: Record<string, unknown>;
}

export interface CallAnalysisResult {
  summary: string;
  outcome: string;
  buyingSignals: string[];
  buyingSignalScore: number;
  nextSteps: string[];
}

export interface ProposalBlueprintResult {
  problemStatement: string;
  keyPains: string[];
  estimatedRevenueLeak: string;
  proposedSolution: string;
  deliverables: string[];
  suggestedInvestment: string;
  urgencyFrame: string;
  loomScriptOutline: string[];
}

export interface BuyingSignalResult {
  signals: string[];
  score: number;
}

export interface ExecutiveReport {
  period: string;
  leadsAdded: number;
  qualifiedPercent: number;
  pipelineValue: number;
  revenueForcast: number;
  stuckDeals: string[];
  systemFailures: number;
  recommendedFocus: string[];
  summary: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private client: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ai.openaiApiKey');
    this.model = this.config.get<string>('ai.model') ?? 'gpt-4o';
    this.client = new OpenAI({ apiKey });
  }

  async qualifyLead(leadData: Record<string, unknown>): Promise<QualificationResult> {
    const prompt = `You are a qualification engine for a client lifecycle infrastructure agency. The agency installs structured backend systems (intake, qualification, CRM, call tracking, onboarding, retention) for service businesses and agencies that generate leads but lack backend revenue control.

Ideal client profile (ICP):
- Runs an agency, consulting practice, or service business
- Generates or runs paid traffic to generate leads
- Lacks structured intake, follow-up, qualification, or onboarding systems
- Revenue leaking due to disorganised lead handling, no state tracking, or manual chaos

Qualification rules:
- Score 80-100 (hot, direct_call): Service business, clearly generating leads, visible infrastructure gaps, paid traffic or active outreach
- Score 50-79 (warm, outreach): Service business, some lead flow, unclear infrastructure status, needs investigation
- Score 20-49 (cold, nurture): Early stage, low lead volume, or unclear if they sell a service
- Score 0-19 (ignore): Not a service business, no lead generation, or product company

estimatedMonthlyRevenueLeak: estimate in GBP how much revenue they're likely losing per month due to lack of lifecycle infrastructure (unqualified leads, no follow-up, no onboarding, no retention). Base this on industry, company size, and lead volume signals.

Lead data: ${JSON.stringify(leadData, null, 2)}

Return ONLY valid JSON:
{
  "qualificationScore": <number 0-100>,
  "temperature": <"cold" | "warm" | "hot">,
  "recommendedPath": <"outreach" | "nurture" | "direct_call" | "ignore">,
  "estimatedMonthlyRevenueLeak": <number in GBP>,
  "reasoning": <string, 2-3 sentences explaining the score and path>,
  "interestProfile": {
    "pain_points": [],
    "infrastructure_gaps": [],
    "budget_signals": [],
    "timeline_signals": []
  }
}`;

    return this.callWithRetry<QualificationResult>(prompt, 'qualifyLead');
  }

  async summarizeCall(transcript: string): Promise<CallAnalysisResult> {
    const prompt = `You are an expert sales analyst. Analyze this call transcript and return a structured JSON summary.

Transcript:
${transcript}

Return ONLY valid JSON matching this schema:
{
  "summary": <string, 2-3 sentences>,
  "outcome": <string, one sentence>,
  "buyingSignals": <array of string quotes or phrases indicating buying intent>,
  "buyingSignalScore": <number 0-100, how strong is the buying intent>,
  "nextSteps": <array of strings>
}`;

    return this.callWithRetry<CallAnalysisResult>(prompt, 'summarizeCall');
  }

  async generateProposalBlueprint(
    callAnalysis: CallAnalysisResult,
    leadData: Record<string, unknown>,
  ): Promise<ProposalBlueprintResult> {
    const prompt = `You are a proposal architect for a client lifecycle infrastructure agency. Based on a sales call analysis and lead data, generate a proposal blueprint the founder can use to build a Loom walkthrough and written proposal.

The agency installs Client Lifecycle Infrastructure: structured backend systems covering intake, qualification, CRM architecture, call booking, post-call structuring, deal routing, onboarding, and retention for service businesses and agencies.

Offer tiers:
- Website Install: £500+ (conversion-focused, CRM-connected, infrastructure-ready)
- Lifecycle Infrastructure Install: £2,500+ (full 8-component system)
- Modular layers: Lead Control, Sales Optimisation, Retention (each builds toward full install)

Call analysis:
${JSON.stringify(callAnalysis, null, 2)}

Lead data:
${JSON.stringify(leadData, null, 2)}

Return ONLY valid JSON:
{
  "problemStatement": <string, 1-2 sentences framing their specific problem>,
  "keyPains": <array of 3-5 specific pain points identified from the call>,
  "estimatedRevenueLeak": <string, e.g. "£3,000-£8,000/month from unqualified leads and no follow-up">,
  "proposedSolution": <string, which offer tier and why — be specific to their situation>,
  "deliverables": <array of specific deliverables for the proposed offer>,
  "suggestedInvestment": <string, e.g. "£2,500 one-time install">,
  "urgencyFrame": <string, 1 sentence on why acting now matters for them specifically>,
  "loomScriptOutline": <array of 5-7 bullet points covering what to walk through in the Loom video>
}`;

    return this.callWithRetry<ProposalBlueprintResult>(prompt, 'generateProposalBlueprint');
  }

  async detectBuyingSignals(text: string): Promise<BuyingSignalResult> {
    const prompt = `Analyze this text for buying signals and return a JSON result.

Text: ${text}

Return ONLY valid JSON:
{
  "signals": <array of detected buying signal phrases>,
  "score": <number 0-100>
}`;

    return this.callWithRetry<BuyingSignalResult>(prompt, 'detectBuyingSignals');
  }

  async generateExecutiveReport(data: Record<string, unknown>): Promise<ExecutiveReport> {
    const prompt = `You are a CRM analytics expert. Generate a weekly executive report from the following pipeline data.

Data: ${JSON.stringify(data, null, 2)}

Return ONLY valid JSON matching this schema:
{
  "period": <string>,
  "leadsAdded": <number>,
  "qualifiedPercent": <number>,
  "pipelineValue": <number>,
  "revenueForcast": <number>,
  "stuckDeals": <array of deal descriptions>,
  "systemFailures": <number>,
  "recommendedFocus": <array of action items>,
  "summary": <string, executive paragraph>
}`;

    return this.callWithRetry<ExecutiveReport>(prompt, 'generateExecutiveReport');
  }

  private async callWithRetry<T>(prompt: string, method: string, maxRetries = 2): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty AI response');

        return JSON.parse(content) as T;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(`AI ${method} attempt ${attempt + 1} failed: ${lastError.message}`);
        if (attempt < maxRetries) await this.sleep(1000 * (attempt + 1));
      }
    }
    throw lastError ?? new Error('AI call failed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
