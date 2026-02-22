import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';

export interface JobHandler {
  readonly jobType: JobType;
  handle(job: RawJob): Promise<void>;
}
