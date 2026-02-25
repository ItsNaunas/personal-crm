import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { LifecycleStage, RecommendedPath, NextAction, LeadPriority, Temperature, Prisma } from '@prisma/client';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QualificationService } from '../qualification/qualification.service';
import { EnrichmentService } from '../enrichment/enrichment.service';
import {
  STAGE_NEXT_ACTION,
  getContactedFollowUpDays,
} from './lead-next-action.constant';

export interface LeadFilters {
  lifecycleStage?: LifecycleStage;
  temperature?: string;
  priority?: LeadPriority;
  nextAction?: NextAction;
  recommendedPath?: RecommendedPath;
  platform?: string;
  leadSource?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

const SORTABLE_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastStateChange: 'lastStateChange',
  lifecycleStage: 'lifecycleStage',
  name: 'name',
  priority: 'priority',
  temperature: 'temperature',
  nextAction: 'nextAction',
  recommendedPath: 'recommendedPath',
};

const PAGE_SIZE_MAX = 200;
const SELECT_ALL_IDS_LIMIT = 2000;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly qualificationService: QualificationService,
    private readonly enrichmentService: EnrichmentService,
  ) {}

  private buildWhere(orgId: string, filters?: LeadFilters): Prisma.LeadWhereInput {
    const searchWhere: Prisma.LeadWhereInput = filters?.q
      ? {
          OR: [
            { name: { contains: filters.q, mode: 'insensitive' } },
            { email: { contains: filters.q, mode: 'insensitive' } },
            { companyName: { contains: filters.q, mode: 'insensitive' } },
            { domain: { contains: filters.q, mode: 'insensitive' } },
          ],
        }
      : {};
    return {
      orgId,
      ...(filters?.lifecycleStage ? { lifecycleStage: filters.lifecycleStage } : {}),
      ...(filters?.temperature ? { temperature: filters.temperature as 'cold' | 'warm' | 'hot' } : {}),
      ...(filters?.priority ? { priority: filters.priority } : {}),
      ...(filters?.nextAction ? { nextAction: filters.nextAction } : {}),
      ...(filters?.recommendedPath ? { recommendedPath: filters.recommendedPath } : {}),
      ...(filters?.platform?.trim() ? { platform: { contains: filters.platform.trim(), mode: 'insensitive' } } : {}),
      ...(filters?.leadSource?.trim() ? { leadSource: { contains: filters.leadSource.trim(), mode: 'insensitive' } } : {}),
      ...searchWhere,
    };
  }

  async create(orgId: string, dto: CreateLeadDto) {
    const now = new Date();
    const defaultNext = STAGE_NEXT_ACTION.new_lead;
    const dueDefault = new Date(now);
    dueDefault.setDate(dueDefault.getDate() + defaultNext.dueDays);
    const lead = await this.prisma.lead.create({
      data: {
        orgId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        domain: dto.domain,
        industry: dto.industry,
        location: dto.location,
        leadSource: dto.leadSource,
        platform: dto.platform,
        profileLink: dto.profileLink,
        nextAction: dto.nextAction ?? defaultNext.nextAction,
        nextActionDue: dto.nextActionDue ? new Date(dto.nextActionDue) : dueDefault,
        priority: dto.priority ?? 'normal',
        lastStateChange: now,
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.LEAD_CREATED,
      entityType: 'lead',
      entityId: lead.id,
      payload: { leadId: lead.id },
      idempotencyKey: `lead.created:${lead.id}`,
    });

    this.logger.log(`Lead created: ${lead.id}`);
    return lead;
  }

  async findAll(orgId: string, filters?: LeadFilters) {
    const sortField = (filters?.sort && SORTABLE_FIELDS[filters.sort]) ?? 'createdAt';
    const sortOrder = filters?.order === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, filters?.pageSize ?? 50));
    const skip = (page - 1) * pageSize;
    const where = this.buildWhere(orgId, filters);

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: { _count: { select: { deals: true, calls: true } } },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /** Returns lead IDs matching the same filters as findAll, up to limit (for "select all matching"). */
  async findIds(orgId: string, filters?: LeadFilters, limit = SELECT_ALL_IDS_LIMIT): Promise<{ ids: string[]; total: number }> {
    const where = this.buildWhere(orgId, filters);
    const sortField = (filters?.sort && SORTABLE_FIELDS[filters.sort]) ?? 'createdAt';
    const sortOrder = filters?.order === 'asc' ? 'asc' : 'desc';
    const take = Math.min(SELECT_ALL_IDS_LIMIT, Math.max(1, limit));

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        select: { id: true },
        orderBy: { [sortField]: sortOrder },
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { ids: rows.map((r) => r.id), total };
  }

  async findOne(id: string, orgId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, orgId },
      include: {
        _count: { select: { deals: true, calls: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(id: string, orgId: string, dto: UpdateLeadDto) {
    await this.findOne(id, orgId);
    const data: Prisma.LeadUpdateInput = {};
    const str = (v: string | undefined) => (v === '' ? null : v);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = str(dto.email);
    if (dto.phone !== undefined) data.phone = str(dto.phone);
    if (dto.companyName !== undefined) data.companyName = str(dto.companyName);
    if (dto.domain !== undefined) data.domain = str(dto.domain);
    if (dto.industry !== undefined) data.industry = str(dto.industry);
    if (dto.location !== undefined) data.location = str(dto.location);
    if (dto.leadSource !== undefined) data.leadSource = str(dto.leadSource);
    if (dto.platform !== undefined) data.platform = str(dto.platform);
    if (dto.profileLink !== undefined) data.profileLink = str(dto.profileLink);
    if (dto.employeeCount !== undefined) data.employeeCount = dto.employeeCount;
    if (dto.revenueBand !== undefined) data.revenueBand = str(dto.revenueBand);
    if (Object.keys(data).length === 0) return this.findOne(id, orgId);
    return this.prisma.lead.update({
      where: { id },
      data,
      include: { _count: { select: { deals: true, calls: true } } },
    });
  }

  async getActivities(leadId: string, orgId: string) {
    await this.findOne(leadId, orgId);
    return this.prisma.activity.findMany({
      where: { orgId, entityType: 'lead', entityId: leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    const [dealsCount, callsCount, clientsCount] = await Promise.all([
      this.prisma.deal.count({ where: { leadId: id } }),
      this.prisma.call.count({ where: { leadId: id } }),
      this.prisma.client.count({ where: { leadId: id } }),
    ]);
    if (dealsCount > 0 || callsCount > 0 || clientsCount > 0) {
      throw new BadRequestException(
        'Cannot delete lead with related deals, calls, or clients. Remove those first.',
      );
    }
    await this.prisma.activity.deleteMany({
      where: { orgId, entityType: 'lead', entityId: id },
    });
    await this.prisma.lead.delete({ where: { id } });
    this.logger.log(`Lead deleted: ${id}`);
  }

  async bulkDelete(leadIds: string[], orgId: string): Promise<{ deleted: number; skipped: number }> {
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: leadIds }, orgId },
      select: { id: true },
    });
    const validIds = leads.map((l) => l.id);

    const [dealCounts, callCounts, clientCounts] = await Promise.all([
      this.prisma.deal.groupBy({ by: ['leadId'], where: { leadId: { in: validIds } }, _count: true }),
      this.prisma.call.groupBy({ by: ['leadId'], where: { leadId: { in: validIds } }, _count: true }),
      this.prisma.client.groupBy({ by: ['leadId'], where: { leadId: { in: validIds } }, _count: true }),
    ]);

    const blockedIds = new Set([
      ...dealCounts.map((r) => r.leadId),
      ...callCounts.map((r) => r.leadId),
      ...clientCounts.map((r) => r.leadId),
    ]);

    const deletableIds = validIds.filter((id) => !blockedIds.has(id));

    if (deletableIds.length > 0) {
      await this.prisma.activity.deleteMany({
        where: { orgId, entityType: 'lead', entityId: { in: deletableIds } },
      });
      await this.prisma.lead.deleteMany({ where: { id: { in: deletableIds }, orgId } });
      this.logger.log(`Bulk deleted ${deletableIds.length} leads`);
    }

    return { deleted: deletableIds.length, skipped: leadIds.length - deletableIds.length };
  }

  async updateStage(id: string, orgId: string, stage: LifecycleStage) {
    const lead = await this.findOne(id, orgId);
    const now = new Date();

    const data: Prisma.LeadUpdateInput = {
      lifecycleStage: stage,
      lastStateChange: now,
      priority: 'normal', // reset priority when user takes action
    };

    // Set lastContactedAt when moving to a stage that implies we contacted them
    if (['contacted', 'qualified', 'proposal'].includes(stage)) {
      data.lastContactedAt = now;
    }

    if (stage === 'won' || stage === 'lost') {
      data.nextAction = 'no_action';
      data.nextActionDue = null;
    } else if (stage === 'contacted') {
      const dueDays = getContactedFollowUpDays(lead.platform);
      const due = new Date(now);
      due.setDate(due.getDate() + dueDays);
      data.nextAction = 'follow_up';
      data.nextActionDue = due;
    } else {
      const config = STAGE_NEXT_ACTION[stage as keyof typeof STAGE_NEXT_ACTION];
      if (config) {
        const due = new Date(now);
        due.setDate(due.getDate() + config.dueDays);
        data.nextAction = config.nextAction;
        data.nextActionDue = due;
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data,
    });

    if (stage === 'won' && lead.lifecycleStage !== 'won') {
      await this.emitter.emit({
        orgId,
        eventType: EventType.LEAD_REACTIVATED,
        entityType: 'lead',
        entityId: id,
        payload: { leadId: id, fromStage: lead.lifecycleStage, toStage: stage },
      });
    }

    return updated;
  }

  async updateRecommendedPath(id: string, orgId: string, recommendedPath: RecommendedPath) {
    await this.findOne(id, orgId);
    return this.prisma.lead.update({
      where: { id },
      data: { recommendedPath },
    });
  }

  async bulkUpdateStage(leadIds: string[], orgId: string, stage: LifecycleStage) {
    const now = new Date();
    const leads = await this.prisma.lead.findMany({
      where: { id: { in: leadIds }, orgId },
      select: { id: true, platform: true },
    });

    for (const lead of leads) {
      const data: Prisma.LeadUpdateInput = {
        lifecycleStage: stage,
        lastStateChange: now,
        priority: 'normal',
      };
      if (['contacted', 'qualified', 'proposal'].includes(stage)) {
        data.lastContactedAt = now;
      }
      if (stage === 'won' || stage === 'lost') {
        data.nextAction = 'no_action';
        data.nextActionDue = null;
      } else if (stage === 'contacted') {
        const dueDays = getContactedFollowUpDays(lead.platform);
        const due = new Date(now);
        due.setDate(due.getDate() + dueDays);
        data.nextAction = 'follow_up';
        data.nextActionDue = due;
      } else {
        const config = STAGE_NEXT_ACTION[stage as keyof typeof STAGE_NEXT_ACTION];
        if (config) {
          const due = new Date(now);
          due.setDate(due.getDate() + config.dueDays);
          data.nextAction = config.nextAction;
          data.nextActionDue = due;
        }
      }
      await this.prisma.lead.update({ where: { id: lead.id }, data });
    }

    return { updated: leads.length };
  }

  async bulkUpdateRecommendedPath(leadIds: string[], orgId: string, recommendedPath: RecommendedPath) {
    await this.prisma.lead.updateMany({
      where: { id: { in: leadIds }, orgId },
      data: { recommendedPath },
    });
    return { updated: leadIds.length };
  }

  async bulkUpdateTemperature(leadIds: string[], orgId: string, temperature: Temperature | null) {
    await this.prisma.lead.updateMany({
      where: { id: { in: leadIds }, orgId },
      data: { temperature: temperature ?? undefined },
    });
    return { updated: leadIds.length };
  }

  async bulkUpdatePlatform(leadIds: string[], orgId: string, platform: string | null) {
    await this.prisma.lead.updateMany({
      where: { id: { in: leadIds }, orgId },
      data: { platform: platform ?? undefined },
    });
    return { updated: leadIds.length };
  }

  async bulkUpdatePriority(leadIds: string[], orgId: string, priority: LeadPriority | null) {
    await this.prisma.lead.updateMany({
      where: { id: { in: leadIds }, orgId },
      data: { priority: priority ?? undefined },
    });
    return { updated: leadIds.length };
  }

  async bulkUpdateLeadSource(leadIds: string[], orgId: string, leadSource: string | null) {
    await this.prisma.lead.updateMany({
      where: { id: { in: leadIds }, orgId },
      data: { leadSource: leadSource ?? undefined },
    });
    return { updated: leadIds.length };
  }

  async updateNextAction(id: string, orgId: string, nextAction: NextAction | null, nextActionDue?: string | null) {
    await this.findOne(id, orgId);
    return this.prisma.lead.update({
      where: { id },
      data: {
        nextAction: nextAction ?? undefined,
        nextActionDue: nextActionDue === null ? null : nextActionDue ? new Date(nextActionDue) : undefined,
      },
    });
  }

  async updatePriority(id: string, orgId: string, priority: LeadPriority | null) {
    await this.findOne(id, orgId);
    return this.prisma.lead.update({
      where: { id },
      data: { priority: priority ?? undefined },
    });
  }

  async updateTemperature(id: string, orgId: string, temperature: Temperature | null) {
    await this.findOne(id, orgId);
    return this.prisma.lead.update({
      where: { id },
      data: { temperature: temperature ?? undefined },
    });
  }

  async merge(masterId: string, duplicateId: string, orgId: string) {
    const [master, duplicate] = await Promise.all([
      this.findOne(masterId, orgId),
      this.findOne(duplicateId, orgId),
    ]);

    // Copy non-null fields from duplicate to master where master is null
    const updateData: Prisma.LeadUpdateInput = {};
    const fields = ['email', 'phone', 'companyName', 'domain', 'industry', 'location', 'leadSource', 'platform', 'profileLink'] as const;
    for (const f of fields) {
      if (!master[f] && duplicate[f]) {
        (updateData as Record<string, unknown>)[f] = duplicate[f];
      }
    }

    await this.prisma.$transaction([
      // Move related records to master
      this.prisma.deal.updateMany({ where: { leadId: duplicateId }, data: { leadId: masterId } }),
      this.prisma.call.updateMany({ where: { leadId: duplicateId }, data: { leadId: masterId } }),
      this.prisma.client.updateMany({ where: { leadId: duplicateId }, data: { leadId: masterId } }),
      this.prisma.leadTag.deleteMany({ where: { leadId: duplicateId } }),
      this.prisma.activity.updateMany({ where: { orgId, entityType: 'lead', entityId: duplicateId }, data: { entityId: masterId } }),
      // Update master with merged fields
      this.prisma.lead.update({ where: { id: masterId }, data: updateData }),
      // Delete duplicate
      this.prisma.lead.delete({ where: { id: duplicateId } }),
    ]);

    return this.findOne(masterId, orgId);
  }

  async qualify(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.qualificationService.qualify(id, orgId);
    return this.findOne(id, orgId);
  }

  async enrich(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.enrichmentService.enrich(id, orgId);
    return this.findOne(id, orgId);
  }
}
