import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { DealStage } from '@prisma/client';
import { CreateDealDto, UpdateDealStageDto, UpdateDealDto } from './dto/create-deal.dto';

const VALID_TRANSITIONS: Partial<Record<DealStage, DealStage[]>> = {
  discovery: ['proposal', 'lost'],
  proposal: ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
};

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async create(orgId: string, dto: CreateDealDto) {
    await this.prisma.lead.findFirstOrThrow({ where: { id: dto.leadId, orgId } });

    const deal = await this.prisma.deal.create({
      data: {
        orgId,
        leadId: dto.leadId,
        dealValue: dto.dealValue,
        probability: dto.probability ?? 0.1,
        stage: 'discovery',
        stageLastChangedAt: new Date(),
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.DEAL_CREATED,
      entityType: 'deal',
      entityId: deal.id,
      payload: { dealId: deal.id, leadId: dto.leadId },
      idempotencyKey: `deal.created:${deal.id}`,
    });

    this.logger.log(`Deal created: ${deal.id}`);
    return this.withWeightedValue(deal);
  }

  async updateStage(id: string, orgId: string, dto: UpdateDealStageDto) {
    const deal = await this.prisma.deal.findFirst({ where: { id, orgId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const allowed = VALID_TRANSITIONS[deal.stage];
    if (!allowed?.includes(dto.stage)) {
      throw new BadRequestException(`Invalid stage transition: ${deal.stage} → ${dto.stage}`);
    }

    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        stage: dto.stage,
        stageLastChangedAt: new Date(),
        ...(dto.lostReason ? { lostReason: dto.lostReason } : {}),
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.DEAL_STAGE_CHANGED,
      entityType: 'deal',
      entityId: id,
      payload: { dealId: id, fromStage: deal.stage, toStage: dto.stage },
    });

    if (dto.stage === 'won') {
      await this.emitter.emit({
        orgId,
        eventType: EventType.DEAL_WON,
        entityType: 'deal',
        entityId: id,
        payload: { dealId: id, leadId: deal.leadId },
        idempotencyKey: `deal.won:${id}`,
      });
    }

    if (dto.stage === 'lost') {
      await this.emitter.emit({
        orgId,
        eventType: EventType.DEAL_LOST,
        entityType: 'deal',
        entityId: id,
        payload: { dealId: id, reason: dto.lostReason },
        idempotencyKey: `deal.lost:${id}`,
      });
    }

    this.logger.log(`Deal ${id} stage: ${deal.stage} → ${dto.stage}`);
    return this.withWeightedValue(updated);
  }

  async update(id: string, orgId: string, dto: UpdateDealDto) {
    await this.prisma.deal.findFirstOrThrow({ where: { id, orgId } });
    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        ...(dto.dealValue !== undefined ? { dealValue: dto.dealValue } : {}),
        ...(dto.probability !== undefined ? { probability: dto.probability } : {}),
      },
    });
    return this.withWeightedValue(updated);
  }

  async findAll(orgId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: { lead: true },
    });
    return deals.map(this.withWeightedValue);
  }

  async findOne(id: string, orgId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, orgId },
      include: { lead: true, invoices: true },
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return this.withWeightedValue(deal);
  }

  private withWeightedValue<T extends { dealValue: number; probability: number }>(deal: T) {
    return { ...deal, weightedValue: deal.dealValue * deal.probability };
  }
}
