import { Module } from '@nestjs/common';
import { EnrichmentModule } from '../enrichment/enrichment.module';
import { QualificationModule } from '../qualification/qualification.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ClientsModule } from '../clients/clients.module';
import { AIModule } from '../ai/ai.module';
import { WebhookModule } from '../webhook/webhook.module';

import { WorkerProcessor, JOB_HANDLERS } from './worker.processor';
import { JobHandler } from './interfaces/job-handler.interface';

import { ProcessIntakeHandler } from './handlers/process-intake.handler';
import { EnrichLeadHandler } from './handlers/enrich-lead.handler';
import { QualifyLeadHandler } from './handlers/qualify-lead.handler';
import { RouteOutreachHandler } from './handlers/route-outreach.handler';
import { AnalyzeCallHandler } from './handlers/analyze-call.handler';
import { GenerateProposalBlueprintHandler } from './handlers/generate-proposal-blueprint.handler';
import { CreateInvoiceHandler } from './handlers/create-invoice.handler';
import { GenerateContractHandler } from './handlers/generate-contract.handler';
import { CreateClientHandler } from './handlers/create-client.handler';
import { StartOnboardingHandler } from './handlers/start-onboarding.handler';
import { NudgeDealHandler } from './handlers/nudge-deal.handler';
import { EscalateLeadHandler } from './handlers/escalate-lead.handler';
import { SendRenewalReminderHandler } from './handlers/send-renewal-reminder.handler';
import { TriggerTestimonialHandler } from './handlers/trigger-testimonial.handler';
import { TriggerReferralHandler } from './handlers/trigger-referral.handler';
import { TriggerUpsellHandler } from './handlers/trigger-upsell.handler';
import { HandleStaleLeadHandler } from './handlers/handle-stale-lead.handler';
import { HandleDealLostHandler } from './handlers/handle-deal-lost.handler';
import { CheckDealDecayHandler } from './handlers/check-deal-decay.handler';
import { CheckLeadStaleHandler } from './handlers/check-lead-stale.handler';
import { AutoPriorityHandler } from './handlers/auto-priority.handler';
import { RecalcGhostRiskHandler } from './handlers/recalc-ghost-risk.handler';
import { CheckIntegrityHandler } from './handlers/check-integrity.handler';
import { GenerateWeeklyReportHandler } from './handlers/generate-weekly-report.handler';

const HANDLER_CLASSES = [
  ProcessIntakeHandler,
  EnrichLeadHandler,
  QualifyLeadHandler,
  RouteOutreachHandler,
  AnalyzeCallHandler,
  GenerateProposalBlueprintHandler,
  CreateInvoiceHandler,
  GenerateContractHandler,
  CreateClientHandler,
  StartOnboardingHandler,
  HandleStaleLeadHandler,
  HandleDealLostHandler,
  NudgeDealHandler,
  EscalateLeadHandler,
  SendRenewalReminderHandler,
  TriggerTestimonialHandler,
  TriggerReferralHandler,
  TriggerUpsellHandler,
  CheckDealDecayHandler,
  CheckLeadStaleHandler,
  AutoPriorityHandler,
  RecalcGhostRiskHandler,
  CheckIntegrityHandler,
  GenerateWeeklyReportHandler,
];

@Module({
  imports: [EnrichmentModule, QualificationModule, InvoicesModule, ClientsModule, AIModule, WebhookModule],
  providers: [
    ...HANDLER_CLASSES,
    {
      provide: JOB_HANDLERS,
      useFactory: (...handlers: JobHandler[]) => handlers,
      inject: HANDLER_CLASSES,
    },
    WorkerProcessor,
  ],
  exports: [WorkerProcessor],
})
export class WorkersModule {}
