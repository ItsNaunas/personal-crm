import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Full analytics dashboard (pipeline, funnel, velocity, lostRevenue)' })
  dashboard(@OrgId() orgId: string) {
    return this.analyticsService.getDashboard(orgId);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Pipeline summary with computed weighted value' })
  pipeline(@OrgId() orgId: string) {
    return this.analyticsService.getPipelineSummary(orgId);
  }

  @Get('velocity')
  @ApiOperation({ summary: 'Revenue velocity metrics including avg days per stage' })
  velocity(@OrgId() orgId: string) {
    return this.analyticsService.getRevenueVelocity(orgId);
  }

  @Get('funnel')
  @ApiOperation({ summary: 'Lead funnel counts by lifecycle stage' })
  funnel(@OrgId() orgId: string) {
    return this.analyticsService.getLeadFunnel(orgId);
  }

  @Get('lost-revenue')
  @ApiOperation({ summary: 'Estimated lost revenue from lost deals' })
  lostRevenue(@OrgId() orgId: string) {
    return this.analyticsService.getLostRevenue(orgId);
  }

  @Get('leads-by-source')
  @ApiOperation({ summary: 'Lead counts grouped by source' })
  leadsBySource(@OrgId() orgId: string) {
    return this.analyticsService.getLeadsBySource(orgId);
  }

  @Get('leads-by-path')
  @ApiOperation({ summary: 'Lead counts grouped by recommended path' })
  leadsByPath(@OrgId() orgId: string) {
    return this.analyticsService.getLeadsByRecommendedPath(orgId);
  }

  @Get('stale-leads')
  @ApiOperation({ summary: 'Count of stale leads (no activity for N days)' })
  @ApiQuery({ name: 'staleDays', required: false, description: 'Days without activity (default 7)' })
  staleLeads(
    @OrgId() orgId: string,
    @Query('staleDays', new DefaultValuePipe(7), ParseIntPipe) staleDays: number,
  ) {
    return this.analyticsService.getStaleLeads(orgId, staleDays).then((count) => ({ count, staleDays }));
  }

  @Get('revenue-by-source')
  @ApiOperation({ summary: 'Won deal revenue grouped by lead source and platform' })
  revenueBySource(@OrgId() orgId: string) {
    return this.analyticsService.getRevenueBySource(orgId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'Today actions: to contact, follow up, calls, renewals' })
  actions(@OrgId() orgId: string) {
    return this.analyticsService.getActions(orgId);
  }
}
