import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntakeService } from './intake.service';
import { CreateIntakeDto, WebhookIntakeDto } from './dto/create-intake.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('intake')
@Controller('intake')
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post('csv')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Bulk CSV lead intake' })
  async csv(@OrgId() orgId: string, @Body() body: CreateIntakeDto) {
    return this.intakeService.submitBatch(orgId, body.leads as Record<string, unknown>[], 'csv');
  }

  @Post('form')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Single form submission' })
  async form(@OrgId() orgId: string, @Body() body: Record<string, unknown>) {
    const id = await this.intakeService.submitSingle(orgId, body, 'form');
    return { accepted: id !== null, id };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Webhook intake — never mutates state directly' })
  async webhook(@OrgId() orgId: string, @Body() body: WebhookIntakeDto) {
    const id = await this.intakeService.submitSingle(orgId, body.payload, 'webhook');
    return { accepted: id !== null, id };
  }
}
