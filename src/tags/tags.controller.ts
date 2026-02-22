import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateTagDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

class AddTagDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tagId!: string;
}

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags' })
  findAll(@OrgId() orgId: string) {
    return this.tagsService.findAll(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  create(@OrgId() orgId: string, @Body() dto: CreateTagDto) {
    return this.tagsService.create(orgId, dto.name, dto.color);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.tagsService.remove(id, orgId);
  }

  // Lead tag routes
  @Get('leads/:leadId')
  @ApiOperation({ summary: 'Get tags for a lead' })
  getLeadTags(@Param('leadId') leadId: string, @OrgId() orgId: string) {
    return this.tagsService.getLeadTags(leadId, orgId);
  }

  @Post('leads/:leadId')
  @ApiOperation({ summary: 'Add tag to a lead' })
  addLeadTag(@Param('leadId') leadId: string, @OrgId() orgId: string, @Body() dto: AddTagDto) {
    return this.tagsService.addLeadTag(leadId, dto.tagId, orgId);
  }

  @Delete('leads/:leadId/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove tag from a lead' })
  removeLeadTag(@Param('leadId') leadId: string, @Param('tagId') tagId: string, @OrgId() orgId: string) {
    return this.tagsService.removeLeadTag(leadId, tagId, orgId);
  }

  // Deal tag routes
  @Get('deals/:dealId')
  @ApiOperation({ summary: 'Get tags for a deal' })
  getDealTags(@Param('dealId') dealId: string, @OrgId() orgId: string) {
    return this.tagsService.getDealTags(dealId, orgId);
  }

  @Post('deals/:dealId')
  @ApiOperation({ summary: 'Add tag to a deal' })
  addDealTag(@Param('dealId') dealId: string, @OrgId() orgId: string, @Body() dto: AddTagDto) {
    return this.tagsService.addDealTag(dealId, dto.tagId, orgId);
  }

  @Delete('deals/:dealId/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove tag from a deal' })
  removeDealTag(@Param('dealId') dealId: string, @Param('tagId') tagId: string, @OrgId() orgId: string) {
    return this.tagsService.removeDealTag(dealId, tagId, orgId);
  }
}
