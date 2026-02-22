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
    const prompt = `You are a B2B sales qualification expert. Analyze the following lead data and return a JSON qualification result.

Lead data: ${JSON.stringify(leadData, null, 2)}

Return ONLY valid JSON matching this schema:
{
  "qualificationScore": <number 0-100>,
  "temperature": <"cold" | "warm" | "hot">,
  "recommendedPath": <"outreach" | "nurture" | "direct_call" | "ignore">,
  "estimatedMonthlyRevenueLeak": <number in USD, estimate based on company size>,
  "reasoning": <string>,
  "interestProfile": { "pain_points": [], "budget_signals": [], "timeline_signals": [] }
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
