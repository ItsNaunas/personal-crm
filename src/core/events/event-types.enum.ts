export enum EventType {
  // Lead lifecycle
  LEAD_CREATED = 'lead.created',
  LEAD_ENRICHED = 'lead.enriched',
  LEAD_QUALIFIED = 'lead.qualified',
  LEAD_STALE = 'lead.stale',
  LEAD_REACTIVATED = 'lead.reactivated',

  // Buying signals
  BUYING_SIGNAL_HIGH = 'buying_signal.high',

  // Call lifecycle
  CALL_BOOKED = 'call.booked',
  CALL_COMPLETED = 'call.completed',
  CALL_ANALYZED = 'call.analyzed',
  CALL_NO_SHOW = 'call.no_show',

  // Deal lifecycle
  DEAL_CREATED = 'deal.created',
  DEAL_STAGE_CHANGED = 'deal.stage_changed',
  DEAL_WON = 'deal.won',
  DEAL_LOST = 'deal.lost',
  DEAL_STALLED = 'deal.stalled',

  // Invoice lifecycle
  INVOICE_CREATED = 'invoice.created',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',
  CONTRACT_SIGNED = 'contract.signed',

  // Client lifecycle
  CLIENT_CREATED = 'client.created',
  CLIENT_ONBOARDING_COMPLETE = 'client.onboarding_complete',
  RENEWAL_UPCOMING = 'renewal.upcoming',
  TESTIMONIAL_DUE = 'client.testimonial_due',
  REFERRAL_DUE = 'client.referral_due',
  UPSELL_DUE = 'client.upsell_due',

  // Scheduler synthetic events
  SCHEDULER_DEAL_DECAY_CHECK = 'scheduler.deal_decay_check',
  SCHEDULER_LEAD_STALE_CHECK = 'scheduler.lead_stale_check',
  SCHEDULER_AUTO_PRIORITY_CHECK = 'scheduler.auto_priority_check',
  SCHEDULER_GHOST_RISK_RECALC = 'scheduler.ghost_risk_recalc',
  SCHEDULER_RENEWAL_REMINDER = 'scheduler.renewal_reminder',
  SCHEDULER_WEEKLY_AI_REPORT = 'scheduler.weekly_ai_report',
  SCHEDULER_INTEGRITY_WATCHDOG = 'scheduler.integrity_watchdog',

  // System events
  SYSTEM_JOB_DEAD_LETTERED = 'system.job_dead_lettered',
  SYSTEM_INTEGRITY_ALERT = 'system.integrity_alert',
}
