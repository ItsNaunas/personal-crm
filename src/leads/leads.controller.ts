import { Controller, Get, Post, Param, Body, Query, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { OrgId } from '../common/decorators/org-id.decorator';
import { LifecycleStage, RecommendedPath, NextAction, LeadPriority, Temperature } from '@prisma/client';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lead directly (bypasses intake)' })
  create(@OrgId() orgId: string, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List leads with optional filters, search, and sort' })
  @ApiQuery({ name: 'lifecycleStage', required: false, enum: LifecycleStage })
  @ApiQuery({ name: 'temperature', required: false, enum: ['cold', 'warm', 'hot'] })
  @ApiQuery({ name: 'priority', required: false, enum: LeadPriority })
  @ApiQuery({ name: 'nextAction', required: false, enum: NextAction })
  @ApiQuery({ name: 'recommendedPath', required: false, enum: RecommendedPath })
  @ApiQuery({ name: 'platform', required: false, description: 'Filter by platform (e.g. linkedin, cold_email)' })
  @ApiQuery({ name: 'leadSource', required: false, description: 'Filter by lead source' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by name, email, company, domain' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field: createdAt|updatedAt|lastStateChange|lifecycleStage|name' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  findAll(
    @OrgId() orgId: string,
    @Query('lifecycleStage') lifecycleStage?: LifecycleStage,
    @Query('temperature') temperature?: string,
    @Query('priority') priority?: LeadPriority,
    @Query('nextAction') nextAction?: NextAction,
    @Query('recommendedPath') recommendedPath?: RecommendedPath,
    @Query('platform') platform?: string,
    @Query('leadSource') leadSource?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    return this.leadsService.findAll(orgId, {
      lifecycleStage,
      temperature,
      priority,
      nextAction,
      recommendedPath,
      platform,
      leadSource,
      q,
      sort,
      order,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.leadsService.findOne(id, orgId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get lead activity log' })
  getActivities(@Param('id') id: string, @OrgId() orgId: string) {
    return this.leadsService.getActivities(id, orgId);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete multiple leads (skips leads with related deals/calls/clients)' })
  bulkDelete(@OrgId() orgId: string, @Body() body: { leadIds: string[] }) {
    return this.leadsService.bulkDelete(body.leadIds, orgId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lead' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.leadsService.remove(id, orgId);
  }

  // Bulk PATCH routes must be declared before :id routes so that
  // PATCH /leads/bulk/stage is not matched by :id/stage with id = "bulk"
  @Patch('bulk/stage')
  @ApiOperation({ summary: 'Bulk update lifecycle stage for multiple leads' })
  bulkUpdateStage(
    @OrgId() orgId: string,
    @Body() body: { leadIds: string[]; stage: LifecycleStage },
  ) {
    return this.leadsService.bulkUpdateStage(body.leadIds, orgId, body.stage);
  }

  @Patch('bulk/recommended-path')
  @ApiOperation({ summary: 'Bulk update recommended path for multiple leads' })
  bulkUpdateRecommendedPath(
    @OrgId() orgId: string,
    @Body() body: { leadIds: string[]; recommendedPath: RecommendedPath },
  ) {
    return this.leadsService.bulkUpdateRecommendedPath(body.leadIds, orgId, body.recommendedPath);
  }

  @Patch('bulk/temperature')
  @ApiOperation({ summary: 'Bulk update temperature for multiple leads' })
  bulkUpdateTemperature(
    @OrgId() orgId: string,
    @Body() body: { leadIds: string[]; temperature: Temperature | null },
  ) {
    return this.leadsService.bulkUpdateTemperature(body.leadIds, orgId, body.temperature);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead profile (name, contact, company, etc.)' })
  update(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, orgId, dto);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update lead lifecycle stage' })
  updateStage(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { stage: LifecycleStage },
  ) {
    return this.leadsService.updateStage(id, orgId, body.stage);
  }

  @Patch(':id/recommended-path')
  @ApiOperation({ summary: 'Update lead recommended path' })
  updateRecommendedPath(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { recommendedPath: RecommendedPath },
  ) {
    return this.leadsService.updateRecommendedPath(id, orgId, body.recommendedPath);
  }

  @Patch(':id/next-action')
  @ApiOperation({ summary: 'Update next action and due date for a lead' })
  updateNextAction(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { nextAction?: NextAction | null; nextActionDue?: string | null },
  ) {
    return this.leadsService.updateNextAction(id, orgId, body.nextAction ?? null, body.nextActionDue);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Update priority for a lead' })
  updatePriority(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { priority?: LeadPriority | null },
  ) {
    return this.leadsService.updatePriority(id, orgId, body.priority ?? null);
  }

  @Patch(':id/temperature')
  @ApiOperation({ summary: 'Update temperature for a lead' })
  updateTemperature(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { temperature?: Temperature | null },
  ) {
    return this.leadsService.updateTemperature(id, orgId, body.temperature ?? null);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge duplicate lead into master lead' })
  merge(@OrgId() orgId: string, @Body() body: { masterId: string; duplicateId: string }) {
    return this.leadsService.merge(body.masterId, body.duplicateId, orgId);
  }

  @Post(':id/qualify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger AI qualification for a lead' })
  qualify(@Param('id') id: string, @OrgId() orgId: string) {
    return this.leadsService.qualify(id, orgId);
  }

  @Post(':id/enrich')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger enrichment for a lead' })
  enrich(@Param('id') id: string, @OrgId() orgId: string) {
    return this.leadsService.enrich(id, orgId);
  }
}
