import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';

interface EnrichmentData {
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenueBand?: string;
  location?: string;
  companyName?: string;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);
  private readonly apiUrl?: string;
  private readonly apiKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly config: ConfigService,
  ) {
    this.apiUrl = this.config.get<string>('enrichment.apiUrl');
    this.apiKey = this.config.get<string>('enrichment.apiKey');
  }

  async enrich(leadId: string, orgId: string): Promise<void> {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

    const enriched: EnrichmentData = {};

    if (!lead.domain && lead.email) {
      enriched.domain = this.extractDomain(lead.email);
    }

    if (this.apiUrl && this.apiKey) {
      try {
        const apiData = await this.callEnrichmentApi({
          email: lead.email ?? undefined,
          domain: enriched.domain ?? lead.domain ?? undefined,
        });
        Object.assign(enriched, apiData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Enrichment API failed for lead ${leadId}: ${message}`);
      }
    }

    if (enriched.employeeCount && !enriched.revenueBand) {
      enriched.revenueBand = this.estimateRevenueBand(enriched.employeeCount);
    }

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        domain: enriched.domain ?? lead.domain,
        industry: enriched.industry ?? lead.industry,
        employeeCount: enriched.employeeCount ?? lead.employeeCount,
        revenueBand: enriched.revenueBand ?? lead.revenueBand,
        location: enriched.location ?? lead.location,
        companyName: enriched.companyName ?? lead.companyName,
        lastStateChange: new Date(),
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.LEAD_ENRICHED,
      entityType: 'lead',
      entityId: leadId,
      payload: { leadId, enriched },
      idempotencyKey: `lead.enriched:${leadId}`,
    });

    this.logger.log(`Lead ${leadId} enriched`);
  }

  private extractDomain(email: string): string {
    return email.split('@')[1] ?? '';
  }

  private estimateRevenueBand(employeeCount: number): string {
    if (employeeCount < 10) return '< $1M';
    if (employeeCount < 50) return '$1M - $10M';
    if (employeeCount < 200) return '$10M - $50M';
    if (employeeCount < 1000) return '$50M - $500M';
    return '> $500M';
  }

  private async callEnrichmentApi(params: { email?: string; domain?: string }): Promise<EnrichmentData> {
    const response = await fetch(`${this.apiUrl}/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Enrichment API error: ${response.status}`);
    }

    return response.json() as Promise<EnrichmentData>;
  }
}
