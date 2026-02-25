import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { DeliveryPhase, OnboardingStatus } from '@prisma/client';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List all clients' })
  findAll(@OrgId() orgId: string) {
    return this.clientsService.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return this.clientsService.findOne(id, orgId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update client onboarding or delivery status' })
  updateStatus(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() body: { onboardingStatus?: OnboardingStatus; deliveryPhase?: DeliveryPhase },
  ) {
    return this.clientsService.updateStatus(id, orgId, body);
  }
}
