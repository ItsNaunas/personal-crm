export enum JobType {
  PROCESS_INTAKE = 'process_intake',

  ENRICH_LEAD = 'enrich_lead',
  QUALIFY_LEAD = 'qualify_lead',
  ROUTE_OUTREACH = 'route_outreach',
  ESCALATE_LEAD = 'escalate_lead',

  ANALYZE_CALL = 'analyze_call',

  CREATE_INVOICE = 'create_invoice',
  GENERATE_CONTRACT = 'generate_contract',
  SEND_CONTRACT = 'send_contract',

  CREATE_CLIENT = 'create_client',
  START_ONBOARDING = 'start_onboarding',

  NUDGE_DEAL = 'nudge_deal',
  SEND_RENEWAL_REMINDER = 'send_renewal_reminder',

  CHECK_DEAL_DECAY = 'check_deal_decay',
  CHECK_LEAD_STALE = 'check_lead_stale',
  AUTO_PRIORITY_CHECK = 'auto_priority_check',
  RECALC_GHOST_RISK = 'recalc_ghost_risk',
  CHECK_INTEGRITY = 'check_integrity',
  GENERATE_WEEKLY_REPORT = 'generate_weekly_report',
}
