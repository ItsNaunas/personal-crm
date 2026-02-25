import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CrmEventEmitter } from '../core/events/crm-event-emitter.service';
import { EventType } from '../core/events/event-types.enum';

interface IntegrityViolation {
  rule: string;
  entityType: string;
  entityId: string;
  detail: string;
  severity: 'warn' | 'critical';
}

@Injectable()
export class WatchdogService {
  private readonly logger = new Logger(WatchdogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: CrmEventEmitter,
  ) {}

  async runChecks(orgId: string): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];

    violations.push(...(await this.checkWonDealsWithoutInvoice(orgId)));
    violations.push(...(await this.checkPaidInvoicesWithoutClient(orgId)));
    violations.push(...(await this.checkClientsWithoutOnboarding(orgId)));

    for (const v of violations) {
      await this.emitter.emit({
        orgId,
        eventType: EventType.SYSTEM_INTEGRITY_ALERT,
        entityType: v.entityType,
        entityId: v.entityId,
        payload: { rule: v.rule, detail: v.detail, severity: v.severity },
        idempotencyKey: `integrity.${v.rule}:${v.entityId}:${new Date().toDateString()}`,
      });
    }

    if (violations.length > 0) {
      this.logger.warn(`Watchdog found ${violations.length} integrity violation(s) for org ${orgId}`);
    }

    return violations;
  }

  private async checkWonDealsWithoutInvoice(orgId: string): Promise<IntegrityViolation[]> {
    const wonDeals = await this.prisma.deal.findMany({
      where: { orgId, stage: 'won', invoices: { none: {} } },
      select: { id: true },
    });

    return wonDeals.map((d) => ({
      rule: 'won_deal_no_invoice',
      entityType: 'deal',
      entityId: d.id,
      detail: `Deal ${d.id} is won but has no invoice`,
      severity: 'critical' as const,
    }));
  }

  private async checkPaidInvoicesWithoutClient(orgId: string): Promise<IntegrityViolation[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { orgId, status: 'paid', clientId: null },
      select: { id: true },
    });

    return invoices.map((i) => ({
      rule: 'paid_invoice_no_client',
      entityType: 'invoice',
      entityId: i.id,
      detail: `Invoice ${i.id} is paid but no client was created`,
      severity: 'critical' as const,
    }));
  }

  private async checkClientsWithoutOnboarding(orgId: string): Promise<IntegrityViolation[]> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const clients = await this.prisma.client.findMany({
      where: { orgId, onboardingStatus: 'pending', createdAt: { lt: cutoff } },
      select: { id: true },
    });

    return clients.map((c) => ({
      rule: 'client_stuck_pending',
      entityType: 'client',
      entityId: c.id,
      detail: `Client ${c.id} still pending onboarding 48h after creation`,
      severity: 'warn' as const,
    }));
  }
}
