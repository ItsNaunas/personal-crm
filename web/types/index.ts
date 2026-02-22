// ==================== ENUMS ====================

export type LifecycleStage =
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type Temperature = 'cold' | 'warm' | 'hot';

export type RecommendedPath = 'outreach' | 'nurture' | 'direct_call' | 'ignore';

export type LeadPriority = 'critical' | 'high' | 'normal' | 'low';

export type NextAction = 'contact' | 'follow_up' | 'schedule_call' | 'send_proposal' | 'no_action';

export const LEAD_SOURCES = ['Referral', 'Event', 'Cold outreach', 'Content', 'Paid ad', 'Inbound', 'Import', 'Other'] as const;
export const PLATFORMS = ['Instagram', 'LinkedIn', 'Cold email', 'Twitter', 'Phone', 'Other'] as const;

export type DealStage = 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type CallStatus = 'booked' | 'completed' | 'no_show';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type JobStatus = 'pending' | 'running' | 'failed' | 'completed';

// ==================== LEADS ====================

export interface Lead {
  id: string;
  orgId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  revenueBand?: string | null;
  location?: string | null;
  leadSource?: string | null;
  platform?: string | null;
  profileLink?: string | null;
  lifecycleStage: LifecycleStage;
  nextAction?: NextAction | null;
  nextActionDue?: string | null;
  priority?: LeadPriority | null;
  temperature?: Temperature | null;
  recommendedPath?: RecommendedPath | null;
  /** Alias for qualificationScore */
  icpScore?: number | null;
  qualificationScore?: number | null;
  estimatedMonthlyRevenueLeak?: number | null;
  buyingSignalScore?: number | null;
  interestProfile?: Record<string, unknown> | null;
  ghostRiskScore?: number | null;
  lastStateChange?: string | null;
  lastContactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { deals: number; calls: number };
}

export interface LeadActivity {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey: string;
  createdAt: string;
}

export interface CreateLeadDto {
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  domain?: string;
  industry?: string;
  location?: string;
  leadSource?: string;
  platform?: string;
  profileLink?: string;
  nextAction?: NextAction;
  nextActionDue?: string;
  priority?: LeadPriority;
}

/** Payload for PATCH /leads/:id (profile update). All fields optional. */
export interface UpdateLeadDto {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  domain?: string;
  industry?: string;
  location?: string;
  leadSource?: string;
  platform?: string;
  profileLink?: string;
  employeeCount?: number;
  revenueBand?: string;
}

// ==================== DEALS ====================

export interface Deal {
  id: string;
  orgId: string;
  leadId: string;
  stage: DealStage;
  dealValue: number;
  probability: number;
  weightedValue?: number;
  lostReason?: string | null;
  stageLastChangedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
}

export interface CreateDealDto {
  leadId: string;
  dealValue: number;
  probability?: number;
}

export interface UpdateDealStageDto {
  stage: DealStage;
  lostReason?: string;
}

export interface UpdateDealDto {
  dealValue?: number;
  probability?: number;
}

// ==================== CALLS ====================

export interface Call {
  id: string;
  orgId: string;
  leadId: string;
  status: CallStatus;
  scheduledAt: string;
  completedAt?: string | null;
  transcript?: string | null;
  aiSummary?: string | null;
  outcome?: string | null;
  buyingSignalsDetected?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
}

export interface CreateCallDto {
  leadId: string;
  scheduledAt: string;
}

export interface CompleteCallDto {
  transcript: string;
  outcome: string;
}

// ==================== CLIENTS ====================

export interface Client {
  id: string;
  orgId: string;
  leadId: string;
  dealId: string;
  name: string;
  email?: string | null;
  companyName?: string | null;
  onboardingStatus?: string | null;
  deliveryStatus?: string | null;
  contractUrl?: string | null;
  renewalDate?: string | null;
  churnRiskScore?: number | null;
  satisfactionScore?: number | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
  deal?: Deal;
  deals?: Deal[];
}

// ==================== INVOICES ====================

export interface Invoice {
  id: string;
  orgId: string;
  dealId: string;
  clientId?: string | null;
  amount: number;
  status: InvoiceStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  contractUrl?: string | null;
  contractSigned?: boolean;
  contractSignedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deal?: Deal;
}

// ==================== ANALYTICS ====================

export interface LostRevenue {
  estimatedLost: number;
  lostDeals: number;
}

export interface LeadsBySource {
  source: string;
  count: number;
}

export interface LeadsByPath {
  path: string;
  count: number;
}

export interface PipelineSummary {
  totalPipeline: number;
  weightedPipeline: number;
  dealCount: number;
}

export interface RevenueVelocity {
  avgDaysToClose: number | null;
  avgDaysInDiscovery: number | null;
  avgDaysInProposal: number | null;
  avgDaysInNegotiation: number | null;
  conversionRatePercent: number;
  wonDeals: number;
  totalDeals: number;
}

export interface LeadFunnel {
  stage: LifecycleStage;
  count: number;
}

export interface Dashboard {
  pipeline: PipelineSummary;
  lostRevenue: LostRevenue;
  velocity: RevenueVelocity;
  funnel: LeadFunnel[];
}

// ==================== OBSERVABILITY ====================

export interface Job {
  id: string;
  orgId?: string | null;
  jobType: string;
  status: JobStatus;
  payload?: Record<string, unknown> | null;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledFor?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  createdAt: string;
}

export interface DeadLetterJob {
  id: string;
  orgId?: string | null;
  jobType: string;
  payload?: Record<string, unknown> | null;
  attempts: number;
  lastError?: string | null;
  createdAt: string;
}

export interface CronTask {
  id: string;
  taskType: string;
  cronExpression: string;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  orgId?: string | null;
}

export interface ScheduledTask {
  id: string;
  taskType: string;
  scheduledFor: string;
  executed: boolean;
  orgId?: string | null;
}

// ==================== INTAKE ====================

/** Single lead form (camelCase, used in UI). */
export interface IntakeFormBody {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  domain?: string;
  industry?: string;
  location?: string;
  leadSource?: string;
  profileLink?: string;
  [key: string]: unknown;
}

/** Lead payload for API (snake_case). Used for CSV/form submission. */
export interface IntakeLeadPayload {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  domain?: string;
  industry?: string;
  location?: string;
  lead_source?: string;
  platform?: string;
  temperature?: string;
  profile_link?: string;
  [key: string]: unknown;
}

// ==================== NOTES ====================
export interface Note {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== TASKS ====================
export interface Task {
  id: string;
  orgId: string;
  title: string;
  entityType?: string | null;
  entityId?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  priority?: LeadPriority | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== TEMPLATES ====================
/** Outreach channel tags for templates (cold_email, linkedin, instagram, tiktok, etc.). */
export const TEMPLATE_OUTREACH_CHANNELS = [
  'cold_email',
  'linkedin',
  'instagram',
  'tiktok',
  'twitter',
  'phone',
  'other',
] as const;
export type TemplateOutreachChannel = (typeof TEMPLATE_OUTREACH_CHANNELS)[number];

export interface Template {
  id: string;
  orgId: string;
  name: string;
  body: string;
  variables?: string[] | null;
  outreachChannels?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== SAVED VIEWS ====================
export interface SavedView {
  id: string;
  orgId: string;
  name: string;
  entityType: string;
  filters: Record<string, unknown>;
  sort?: string | null;
  order?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== TAGS ====================
export interface Tag {
  id: string;
  orgId: string;
  name: string;
  color?: string | null;
  createdAt: string;
  _count?: { leadTags: number; dealTags: number };
}

// ==================== ACTIONS ====================
export interface ActionsData {
  toContact: Pick<Lead, 'id' | 'name' | 'email' | 'companyName' | 'profileLink' | 'platform' | 'leadSource' | 'priority' | 'nextActionDue' | 'createdAt' | 'lastContactedAt'>[];
  toFollowUp: Pick<Lead, 'id' | 'name' | 'email' | 'companyName' | 'profileLink' | 'platform' | 'leadSource' | 'priority' | 'nextActionDue' | 'lifecycleStage' | 'lastContactedAt'>[];
  todaysCalls: (Call & { lead?: Pick<Lead, 'id' | 'name' | 'email'> | null })[];
  upcomingRenewals: (Client & { lead?: Pick<Lead, 'id' | 'name' | 'email' | 'companyName'> | null })[];
  contactedToday: { id: string; name: string; companyName: string | null; lastContactedAt: Date | null }[];
  contactedTodayCount: number;
}

// ==================== REVENUE BY SOURCE ====================
export interface RevenueBySource {
  source: string;
  platform: string | null;
  revenue: number;
  dealCount: number;
}

// ==================== API ERROR ====================

export interface ApiError {
  message: string;
  error?: string;
  statusCode?: number;
}
