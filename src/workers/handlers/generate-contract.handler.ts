import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { SystemLogService } from '../../system-log/system-log.service';

interface GenerateContractPayload {
  dealId: string;
}

@Injectable()
export class GenerateContractHandler implements JobHandler {
  readonly jobType = JobType.GENERATE_CONTRACT;
  private readonly logger = new Logger(GenerateContractHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemLog: SystemLogService,
  ) {}

  async handle(job: RawJob): Promise<void> {
    const { dealId } = job.payload as GenerateContractPayload;

    const deal = await this.prisma.deal.findUniqueOrThrow({
      where: { id: dealId },
      include: { lead: true },
    });

    // In production: integrate with DocuSign, PandaDoc, or similar.
    // For now, record the contract URL stub and mark as ready to send.
    const contractUrl = `https://contracts.internal/deal/${dealId}`;

    const invoice = await this.prisma.invoice.findFirst({
      where: { dealId, orgId: job.org_id },
      select: { id: true },
    });

    if (invoice) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { contractUrl },
      });
    }

    await this.systemLog.info('GenerateContractHandler', `Contract generated for deal ${dealId}`, {
      dealId,
      contractUrl,
      leadId: deal.leadId,
    });

    this.logger.log(`Contract generated for deal ${dealId}`);
  }
}
