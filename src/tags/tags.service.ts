import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.tag.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { leadTags: true, dealTags: true } },
      },
    });
  }

  async create(orgId: string, name: string, color?: string) {
    try {
      return await this.prisma.tag.create({ data: { orgId, name, color } });
    } catch {
      throw new ConflictException(`Tag "${name}" already exists`);
    }
  }

  async remove(id: string, orgId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, orgId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.tag.delete({ where: { id } });
  }

  // Lead tags
  async addLeadTag(leadId: string, tagId: string, orgId: string) {
    await this.prisma.lead.findFirstOrThrow({ where: { id: leadId, orgId } });
    await this.prisma.tag.findFirstOrThrow({ where: { id: tagId, orgId } });
    await this.prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId, tagId } },
      create: { leadId, tagId },
      update: {},
    });
  }

  async removeLeadTag(leadId: string, tagId: string, orgId: string) {
    await this.prisma.leadTag.deleteMany({ where: { leadId, tagId } });
  }

  async getLeadTags(leadId: string, orgId: string) {
    await this.prisma.lead.findFirstOrThrow({ where: { id: leadId, orgId } });
    const rows = await this.prisma.leadTag.findMany({ where: { leadId }, include: { tag: true } });
    return rows.map((r) => r.tag);
  }

  // Deal tags
  async addDealTag(dealId: string, tagId: string, orgId: string) {
    await this.prisma.deal.findFirstOrThrow({ where: { id: dealId, orgId } });
    await this.prisma.tag.findFirstOrThrow({ where: { id: tagId, orgId } });
    await this.prisma.dealTag.upsert({
      where: { dealId_tagId: { dealId, tagId } },
      create: { dealId, tagId },
      update: {},
    });
  }

  async removeDealTag(dealId: string, tagId: string, orgId: string) {
    await this.prisma.dealTag.deleteMany({ where: { dealId, tagId } });
  }

  async getDealTags(dealId: string, orgId: string) {
    await this.prisma.deal.findFirstOrThrow({ where: { id: dealId, orgId } });
    const rows = await this.prisma.dealTag.findMany({ where: { dealId }, include: { tag: true } });
    return rows.map((r) => r.tag);
  }
}
