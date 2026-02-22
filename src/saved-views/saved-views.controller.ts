import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SavedViewsService } from './saved-views.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('saved-views')
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly savedViewsService: SavedViewsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a view (filter + sort combination)' })
  create(@OrgId() orgId: string, @Body() dto: CreateSavedViewDto) {
    return this.savedViewsService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List saved views, optionally by entityType' })
  @ApiQuery({ name: 'entityType', required: false })
  findAll(@OrgId() orgId: string, @Query('entityType') entityType?: string) {
    return this.savedViewsService.findAll(orgId, entityType);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved view' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.savedViewsService.remove(id, orgId);
  }
}
