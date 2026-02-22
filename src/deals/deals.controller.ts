import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealStageDto, UpdateDealDto } from './dto/create-deal.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('deals')
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a deal' })
  create(@OrgId() orgId: string, @Body() dto: CreateDealDto) {
    return this.dealsService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all deals (includes computed weightedValue)' })
  findAll(@OrgId() orgId: string) {
    return this.dealsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deal by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.dealsService.findOne(id, orgId);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Advance deal stage (enforces valid transitions)' })
  updateStage(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: UpdateDealStageDto) {
    return this.dealsService.updateStage(id, orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deal value or probability' })
  update(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(id, orgId, dto);
  }
}
