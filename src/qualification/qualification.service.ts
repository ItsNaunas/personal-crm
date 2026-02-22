import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { AIService } from '../ai/ai.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class QualificationService {
  private readonly logger = new Logger(QualificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly aiService: AIService,
  ) {}

  async qualify(leadId: string, orgId: string): Promise<void> {
    const lead = await this.prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

    const leadData = {
      name: lead.name,
      email: lead.email,
      companyName: lead.companyName,
      domain: lead.domain,
      industry: lead.industry,
      employeeCount: lead.employeeCount,
      revenueBand: lead.revenueBand,
      location: lead.location,
      leadSource: lead.leadSource,
      interestProfile: lead.interestProfile,
    };

    const result = await this.aiService.qualifyLead(leadData as Record<string, unknown>);

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        qualificationScore: result.qualificationScore,
        temperature: result.temperature,
        recommendedPath: result.recommendedPath,
        estimatedMonthlyRevenueLeak: result.estimatedMonthlyRevenueLeak,
        interestProfile: result.interestProfile as Prisma.InputJsonValue,
        lifecycleStage: 'qualified',
        lastStateChange: new Date(),
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.LEAD_QUALIFIED,
      entityType: 'lead',
      entityId: leadId,
      payload: {
        leadId,
        qualificationScore: result.qualificationScore,
        temperature: result.temperature,
        recommendedPath: result.recommendedPath,
      },
      idempotencyKey: `lead.qualified:${leadId}`,
    });

    this.logger.log(`Lead ${leadId} qualified — score: ${result.qualificationScore}, path: ${result.recommendedPath}`);
  }
}
