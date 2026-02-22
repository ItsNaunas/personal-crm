import { LifecycleStage, NextAction } from '@prisma/client';

/** Days from now to set nextActionDue when stage is not "contacted". */
export const STAGE_NEXT_ACTION: Record<
  Exclude<LifecycleStage, 'contacted' | 'won' | 'lost'>,
  { nextAction: NextAction; dueDays: number }
> = {
  new_lead: { nextAction: 'contact', dueDays: 1 },
  qualified: { nextAction: 'schedule_call', dueDays: 2 },
  proposal: { nextAction: 'send_proposal', dueDays: 3 },
  negotiation: { nextAction: 'follow_up', dueDays: 1 },
};

/** For "contacted" stage: days until follow-up is due, by platform. */
export const CONTACTED_FOLLOW_UP_DAYS: Record<string, number> = {
  instagram: 2,
  twitter: 2,
  linkedin: 4,
  cold_email: 3,
  phone: 1,
};
const DEFAULT_CONTACTED_DAYS = 3;

/** Days overdue → escalate to high priority (by platform for contacted, else default). */
export const ESCALATE_HIGH_DAYS: Record<string, number> = {
  instagram: 1,
  twitter: 1,
  linkedin: 2,
  cold_email: 2,
  phone: 0.5, // 12h
};
const DEFAULT_HIGH_DAYS = 2;

/** Days overdue → escalate to critical priority (by platform). */
export const ESCALATE_CRITICAL_DAYS: Record<string, number> = {
  instagram: 3,
  twitter: 3,
  linkedin: 5,
  cold_email: 5,
  phone: 2,
};
const DEFAULT_CRITICAL_DAYS = 4;

export function getContactedFollowUpDays(platform: string | null): number {
  const key = platform?.toLowerCase().replace(/\s/g, '') ?? 'other';
  return CONTACTED_FOLLOW_UP_DAYS[key] ?? DEFAULT_CONTACTED_DAYS;
}

export function getEscalateHighDays(platform: string | null): number {
  const key = platform?.toLowerCase().replace(/\s/g, '') ?? 'other';
  return ESCALATE_HIGH_DAYS[key] ?? DEFAULT_HIGH_DAYS;
}

export function getEscalateCriticalDays(platform: string | null): number {
  const key = platform?.toLowerCase().replace(/\s/g, '') ?? 'other';
  return ESCALATE_CRITICAL_DAYS[key] ?? DEFAULT_CRITICAL_DAYS;
}
