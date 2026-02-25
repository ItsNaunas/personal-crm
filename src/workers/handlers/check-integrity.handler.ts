import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { CrmEventEmitter } from '../../core/events/crm-event-emitter.service';
import { EventType } from '../../core/events/event-types.enum';
import { SystemLogService } from '../../system-log/system-log.service';

@Injectable()
export class CheckIntegrityHandler implements JobHandler {
  readonly jobType = JobType.CHECK_INTEGRITY;
  private readonly logger = new Logger(CheckIntegrityHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const alerts: { rule: string; entityId: string; detail: string }[] = [];

    // Rule 1: deal.won but no invoice
    const wonDealsNoInvoice = await this.prisma.deal.findMany({
      where: { orgId: job.org_id, stage: 'won', invoices: { none: {} } },
      select: { id: true },
    });
    for (const deal of wonDealsNoInvoice) {
      alerts.push({ rule: 'won_deal_no_invoice', entityId: deal.id, detail: `Deal ${deal.id} is won but has no invoice` });
    }

    // Rule 2: invoice.paid but no client
    const paidInvoicesNoClient = await this.prisma.invoice.findMany({
      where: { orgId: job.org_id, status: 'paid', clientId: null },
      select: { id: true, dealId: true },
    });
    for (const invoice of paidInvoicesNoClient) {
      alerts.push({ rule: 'paid_invoice_no_client', entityId: invoice.id, detail: `Invoice ${invoice.id} is paid but has no client` });
    }

    // Rule 3: client active but onboarding incomplete
    const clientsMissingOnboarding = await this.prisma.client.findMany({
      where: {
        orgId: job.org_id,
        onboardingStatus: 'pending',
        createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    for (const client of clientsMissingOnboarding) {
      alerts.push({ rule: 'client_no_onboarding', entityId: client.id, detail: `Client ${client.id} has no onboarding status after 48h` });
    }

    for (const alert of alerts) {
      await this.emitter.emit({
        orgId: job.org_id,
        eventType: EventType.SYSTEM_INTEGRITY_ALERT,
        entityType: 'system',
        entityId: alert.entityId,
        payload: alert,
        idempotencyKey: `integrity.${alert.rule}:${alert.entityId}:${new Date().toDateString()}`,
      });
    }

    if (alerts.length > 0) {
      this.logger.warn(`Integrity check found ${alerts.length} violation(s)`);
    } else {
      this.logger.debug('Integrity check passed — no violations');
    }
  }
}
