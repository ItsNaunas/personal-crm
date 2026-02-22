import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';
import { JobsService } from '../core/jobs/jobs.service';
import { JobType } from '../core/jobs/job-types.enum';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly jobsService: JobsService,
  ) {}

  async createForDeal(dealId: string, orgId: string): Promise<string> {
    const deal = await this.prisma.deal.findFirstOrThrow({
      where: { id: dealId, orgId },
    });

    const existing = await this.prisma.invoice.findFirst({ where: { dealId, orgId } });
    if (existing) {
      this.logger.warn(`Invoice already exists for deal ${dealId}`);
      return existing.id;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.invoice.create({
      data: {
        orgId,
        dealId,
        amount: deal.dealValue,
        status: 'draft',
        dueDate,
      },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.INVOICE_CREATED,
      entityType: 'invoice',
      entityId: invoice.id,
      payload: { invoiceId: invoice.id, dealId, amount: deal.dealValue },
      idempotencyKey: `invoice.created:${invoice.id}`,
    });

    this.logger.log(`Invoice ${invoice.id} created for deal ${dealId}`);
    return invoice.id;
  }

  async markPaid(invoiceId: string, orgId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, orgId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'paid', paidAt: new Date() },
    });

    await this.emitter.emit({
      orgId,
      eventType: EventType.INVOICE_PAID,
      entityType: 'invoice',
      entityId: invoiceId,
      payload: { invoiceId, dealId: invoice.dealId },
      idempotencyKey: `invoice.paid:${invoiceId}`,
    });

    this.logger.log(`Invoice ${invoiceId} marked as paid`);
  }

  async findAll(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: { deal: { include: { lead: true } } },
    });
  }

  async findOne(id: string, orgId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, orgId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}
