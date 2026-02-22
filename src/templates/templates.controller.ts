import { Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a message template' })
  create(@OrgId() orgId: string, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all templates' })
  findAll(@OrgId() orgId: string) {
    return this.templatesService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a template by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.templatesService.findOne(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a template' })
  update(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.templatesService.update(id, orgId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.templatesService.remove(id, orgId);
  }
}
