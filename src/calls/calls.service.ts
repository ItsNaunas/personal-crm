import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { CreateCallDto, CompleteCallDto } from './dto/create-call.dto';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async book(orgId: string, dto: CreateCallDto) {
    await this.prisma.lead.findFirstOrThrow({ where: { id: dto.leadId, orgId } });

    const call = await this.prisma.call.create({
      data: {
        orgId,
        leadId: dto.leadId,
        scheduledAt: new Date(dto.scheduledAt),
        status: 'booked',
      },
    });

    await this.prisma.lead.updateMany({
      where: { id: dto.leadId, orgId },
      data: { lastContactedAt: new Date() },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.CALL_BOOKED,
      entityType: 'call',
      entityId: call.id,
      payload: { callId: call.id, leadId: dto.leadId },
      idempotencyKey: `call.booked:${call.id}`,
    });

    this.logger.log(`Call booked: ${call.id}`);
    return call;
  }

  async complete(id: string, orgId: string, dto: CompleteCallDto) {
    const call = await this.prisma.call.findFirst({ where: { id, orgId } });
    if (!call) throw new NotFoundException('Call not found');

    const updated = await this.prisma.call.update({
      where: { id },
      data: {
        status: 'completed',
        transcript: dto.transcript,
        outcome: dto.outcome,
        completedAt: new Date(),
      },
    });

    await this.prisma.lead.updateMany({
      where: { id: call.leadId, orgId },
      data: { lastContactedAt: new Date() },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.CALL_COMPLETED,
      entityType: 'call',
      entityId: id,
      payload: { callId: id, leadId: call.leadId },
      idempotencyKey: `call.completed:${id}`,
    });

    this.logger.log(`Call completed: ${id}`);
    return updated;
  }

  async noShow(id: string, orgId: string) {
    const call = await this.prisma.call.findFirst({ where: { id, orgId } });
    if (!call) throw new NotFoundException('Call not found');

    const updated = await this.prisma.call.update({
      where: { id },
      data: { status: 'no_show' },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.CALL_NO_SHOW,
      entityType: 'call',
      entityId: id,
      payload: { callId: id, leadId: call.leadId },
      idempotencyKey: `call.no_show:${id}`,
    });

    return updated;
  }

  async findAll(orgId: string) {
    return this.prisma.call.findMany({
      where: { orgId },
      orderBy: { scheduledAt: 'desc' },
      include: { lead: true },
    });
  }

  async findOne(id: string, orgId: string) {
    const call = await this.prisma.call.findFirst({ where: { id, orgId }, include: { lead: true } });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }
}
