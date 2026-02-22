export interface RawJob {
  id: string;
  org_id: string;
  created_at: Date;
  updated_at: Date;
  event_id: string | null;
  job_type: string;
  status: string;
  idempotency_key: string | null;
  payload: unknown;
  attempts: number;
  max_attempts: number;
  scheduled_for: Date;
  started_at: Date | null;
  completed_at: Date | null;
  locked_at: Date | null;
  locked_by: string | null;
  last_error: string | null;
}
