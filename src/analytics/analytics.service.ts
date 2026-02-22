import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { Prisma } from '@prisma/client';

export interface PipelineSummary {
  totalPipeline: number;
  weightedPipeline: number;
  dealCount: number;
}

export interface RevenueVelocity {
  avgDaysToClose: number | null;
  avgDaysInDiscovery: number | null;
  avgDaysInProposal: number | null;
  avgDaysInNegotiation: number | null;
  conversionRatePercent: number;
  wonDeals: number;
  totalDeals: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPipelineSummary(orgId: string): Promise<PipelineSummary> {
    const result = await this.prisma.$queryRaw<{ total_pipeline: number; weighted_pipeline: number; deal_count: bigint }[]>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(deal_value), 0) AS total_pipeline,
          COALESCE(SUM(deal_value * probability), 0) AS weighted_pipeline,
          COUNT(*) AS deal_count
        FROM deals
        WHERE org_id = ${orgId}
          AND stage NOT IN ('won', 'lost')
      `,
    );

    const row = result[0] ?? { total_pipeline: 0, weighted_pipeline: 0, deal_count: BigInt(0) };
    return {
      totalPipeline: Number(row.total_pipeline),
      weightedPipeline: Number(row.weighted_pipeline),
      dealCount: Number(row.deal_count),
    };
  }

  async getLostRevenue(orgId: string): Promise<{ estimatedLost: number; lostDeals: number }> {
    const result = await this.prisma.$queryRaw<{ estimated_lost: number; lost_deals: bigint }[]>(
      Prisma.sql`
        SELECT
          COALESCE(SUM(deal_value * probability), 0) AS estimated_lost,
          COUNT(*) AS lost_deals
        FROM deals
        WHERE org_id = ${orgId}
          AND stage = 'lost'
      `,
    );

    const row = result[0] ?? { estimated_lost: 0, lost_deals: BigInt(0) };
    return {
      estimatedLost: Number(row.estimated_lost),
      lostDeals: Number(row.lost_deals),
    };
  }

  async getRevenueVelocity(orgId: string): Promise<RevenueVelocity> {
    const [won, total] = await Promise.all([
      this.prisma.deal.count({ where: { orgId, stage: 'won' } }),
      this.prisma.deal.count({ where: { orgId } }),
    ]);

    const [avgClose, avgDiscovery, avgProposal, avgNegotiation] = await Promise.all([
      this.prisma.$queryRaw<{ avg_days: number | null }[]>(
        Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM (d.updated_at - l.created_at)) / 86400) AS avg_days
          FROM deals d
          JOIN leads l ON d.lead_id = l.id
          WHERE d.org_id = ${orgId}
            AND d.stage = 'won'
        `,
      ),
      this.prisma.$queryRaw<{ avg_days: number | null }[]>(
        Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(d.stage_last_changed_at, d.updated_at) - d.created_at)) / 86400) AS avg_days
          FROM deals d
          WHERE d.org_id = ${orgId}
            AND d.stage != 'discovery'
            AND d.stage_last_changed_at IS NOT NULL
        `,
      ),
      this.prisma.$queryRaw<{ avg_days: number | null }[]>(
        Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(d.stage_last_changed_at, d.updated_at) - d.created_at)) / 86400) AS avg_days
          FROM deals d
          WHERE d.org_id = ${orgId}
            AND d.stage IN ('negotiation', 'won', 'lost')
            AND d.stage_last_changed_at IS NOT NULL
        `,
      ),
      this.prisma.$queryRaw<{ avg_days: number | null }[]>(
        Prisma.sql`
          SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(d.stage_last_changed_at, d.updated_at) - d.created_at)) / 86400) AS avg_days
          FROM deals d
          WHERE d.org_id = ${orgId}
            AND d.stage IN ('won', 'lost')
            AND d.stage_last_changed_at IS NOT NULL
        `,
      ),
    ]);

    return {
      avgDaysToClose: avgClose[0]?.avg_days ? Number(Number(avgClose[0].avg_days).toFixed(1)) : null,
      avgDaysInDiscovery: avgDiscovery[0]?.avg_days ? Number(Number(avgDiscovery[0].avg_days).toFixed(1)) : null,
      avgDaysInProposal: avgProposal[0]?.avg_days ? Number(Number(avgProposal[0].avg_days).toFixed(1)) : null,
      avgDaysInNegotiation: avgNegotiation[0]?.avg_days ? Number(Number(avgNegotiation[0].avg_days).toFixed(1)) : null,
      conversionRatePercent: total > 0 ? Math.round((won / total) * 100) : 0,
      wonDeals: won,
      totalDeals: total,
    };
  }

  async getLeadFunnel(orgId: string) {
    const stages = ['new_lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
    const counts = await Promise.all(
      stages.map((stage) =>
        this.prisma.lead.count({ where: { orgId, lifecycleStage: stage } }).then((count) => ({ stage, count })),
      ),
    );
    return counts;
  }

  async getDashboard(orgId: string) {
    const [pipeline, lostRevenue, velocity, funnel] = await Promise.all([
      this.getPipelineSummary(orgId),
      this.getLostRevenue(orgId),
      this.getRevenueVelocity(orgId),
      this.getLeadFunnel(orgId),
    ]);

    return { pipeline, lostRevenue, velocity, funnel };
  }

  async getLeadsBySource(orgId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { orgId },
      select: { leadSource: true },
    });

    const counts: Record<string, number> = {};
    for (const lead of leads) {
      const source = lead.leadSource ?? 'unknown';
      counts[source] = (counts[source] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getLeadsByRecommendedPath(orgId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { orgId },
      select: { recommendedPath: true },
    });

    const counts: Record<string, number> = {};
    for (const lead of leads) {
      const path = lead.recommendedPath ?? 'unassigned';
      counts[path] = (counts[path] ?? 0) + 1;
    }

    return Object.entries(counts)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getStaleLeads(orgId: string, staleDays = 7) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - staleDays);

    return this.prisma.lead.count({
      where: {
        orgId,
        lifecycleStage: { notIn: ['won', 'lost'] },
        lastStateChange: { lt: threshold },
      },
    });
  }

  async getRevenueBySource(orgId: string) {
    const wonDeals = await this.prisma.deal.findMany({
      where: { orgId, stage: 'won' },
      include: { lead: { select: { leadSource: true, platform: true } } },
    });

    const map: Record<string, { source: string; platform: string | null; revenue: number; dealCount: number }> = {};
    for (const deal of wonDeals) {
      const source = deal.lead?.leadSource ?? 'unknown';
      const platform = deal.lead?.platform ?? null;
      const key = `${source}::${platform ?? ''}`;
      if (!map[key]) {
        map[key] = { source, platform, revenue: 0, dealCount: 0 };
      }
      map[key].revenue += deal.dealValue;
      map[key].dealCount += 1;
    }

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }

  async getActions(orgId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [toContact, toFollowUp, todaysCalls, upcomingRenewals, contactedTodayLeads, contactedTodayCount] =
      await Promise.all([
        this.prisma.lead.findMany({
          where: { orgId, lifecycleStage: 'new_lead' },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            profileLink: true,
            platform: true,
            leadSource: true,
            priority: true,
            nextActionDue: true,
            createdAt: true,
            lastContactedAt: true,
          },
        }),
        this.prisma.lead.findMany({
          where: { orgId, lifecycleStage: { in: ['contacted', 'qualified'] } },
          orderBy: [{ priority: 'asc' }, { lastStateChange: 'asc' }],
          take: 20,
          select: {
            id: true,
            name: true,
            email: true,
            companyName: true,
            profileLink: true,
            platform: true,
            leadSource: true,
            priority: true,
            nextActionDue: true,
            lifecycleStage: true,
            lastStateChange: true,
            lastContactedAt: true,
          },
        }),
        this.prisma.call.findMany({
          where: {
            orgId,
            status: 'booked',
            scheduledAt: { gte: now, lte: endOfDay },
          },
          include: { lead: { select: { id: true, name: true, email: true } } },
          orderBy: { scheduledAt: 'asc' },
        }),
        this.prisma.client.findMany({
          where: {
            orgId,
            renewalDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          },
          include: { lead: { select: { id: true, name: true, email: true, companyName: true } } },
          orderBy: { renewalDate: 'asc' },
          take: 10,
        }),
        this.prisma.lead.findMany({
          where: {
            orgId,
            lastContactedAt: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { lastContactedAt: 'desc' },
          take: 15,
          select: { id: true, name: true, companyName: true, lastContactedAt: true },
        }),
        this.prisma.lead.count({
          where: {
            orgId,
            lastContactedAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

    return {
      toContact,
      toFollowUp,
      todaysCalls,
      upcomingRenewals,
      contactedToday: contactedTodayLeads,
      contactedTodayCount,
    };
  }
}
