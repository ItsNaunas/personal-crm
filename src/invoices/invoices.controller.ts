import { Controller, Get, Param, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices for org (includes deal and lead info)' })
  findAll(@OrgId() orgId: string) {
    return this.invoicesService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.invoicesService.findOne(id, orgId);
  }

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an invoice as paid' })
  markPaid(@Param('id') id: string, @OrgId() orgId: string) {
    return this.invoicesService.markPaid(id, orgId);
  }
}
