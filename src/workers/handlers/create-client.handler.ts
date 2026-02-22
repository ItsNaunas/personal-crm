import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { ClientsService } from '../../clients/clients.service';

interface CreateClientPayload {
  invoiceId: string;
  dealId: string;
}

@Injectable()
export class CreateClientHandler implements JobHandler {
  readonly jobType = JobType.CREATE_CLIENT;
  private readonly logger = new Logger(CreateClientHandler.name);

  constructor(private readonly clientsService: ClientsService) {}

  async handle(job: RawJob): Promise<void> {
    const { invoiceId, dealId } = job.payload as CreateClientPayload;
    this.logger.log(`Creating client from invoice ${invoiceId}`);
    await this.clientsService.createFromInvoice(invoiceId, dealId, job.org_id);
  }
}
