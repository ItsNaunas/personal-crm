import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async createFromInvoice(invoiceId: string, dealId: string, orgId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, orgId } });
    const deal = await this.prisma.deal.findFirstOrThrow({
      where: { id: dealId, orgId },
      select: { leadId: true },
    });

    const existing = await this.prisma.client.findFirst({
      where: { orgId, leadId: deal.leadId, dealId },
    });
    if (existing) {
      this.logger.warn(`Client already exists for deal ${dealId}`);
      return existing.id;
    }

    const renewalDate = new Date();
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);

    const client = await this.prisma.client.create({
      data: {
        orgId,
        leadId: deal.leadId,
        dealId,
        onboardingStatus: 'pending',
        deliveryStatus: 'not_started',
        renewalDate,
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { clientId: client.id },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.CLIENT_CREATED,
      entityType: 'client',
      entityId: client.id,
      payload: { clientId: client.id, dealId, leadId: deal.leadId },
      idempotencyKey: `client.created:${client.id}`,
    });

    this.logger.log(`Client ${client.id} created from invoice ${invoiceId}`);
    return client.id;
  }

  async findAll(orgId: string) {
    return this.prisma.client.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: { lead: true, deal: true },
    });
  }

  async findOne(id: string, orgId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, orgId },
      include: {
        lead: true,
        deal: { include: { invoices: true } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const contractUrl =
      client.deal?.invoices?.find((inv) => inv.contractUrl)?.contractUrl ?? null;

    return { ...client, contractUrl };
  }

  async updateStatus(id: string, orgId: string, data: { onboardingStatus?: string; deliveryStatus?: string }) {
    await this.prisma.client.findFirstOrThrow({ where: { id, orgId } });
    return this.prisma.client.update({ where: { id }, data });
  }
}
