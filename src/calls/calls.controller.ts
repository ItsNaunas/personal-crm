import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CreateCallDto, CompleteCallDto } from './dto/create-call.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('calls')
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a call' })
  book(@OrgId() orgId: string, @Body() dto: CreateCallDto) {
    return this.callsService.book(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all calls' })
  findAll(@OrgId() orgId: string) {
    return this.callsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a call by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.callsService.findOne(id, orgId);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark call complete and upload transcript' })
  complete(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: CompleteCallDto) {
    return this.callsService.complete(id, orgId, dto);
  }

  @Patch(':id/no-show')
  @ApiOperation({ summary: 'Mark call as no-show' })
  noShow(@Param('id') id: string, @OrgId() orgId: string) {
    return this.callsService.noShow(id, orgId);
  }
}
