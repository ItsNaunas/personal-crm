import { Injectable, Logger } from '@nestjs/common';
import { JobHandler } from '../interfaces/job-handler.interface';
import { RawJob } from '../../core/jobs/raw-job.type';
import { JobType } from '../../core/jobs/job-types.enum';
import { PrismaService } from '../../core/database/prisma.service';

interface StartOnboardingPayload {
  clientId: string;
}

@Injectable()
export class StartOnboardingHandler implements JobHandler {
  readonly jobType = JobType.START_ONBOARDING;
  private readonly logger = new Logger(StartOnboardingHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(job: RawJob): Promise<void> {
    const { clientId } = job.payload as StartOnboardingPayload;

    await this.prisma.client.update({
      where: { id: clientId },
      data: { onboardingStatus: 'in_progress' },
    });

    this.logger.log(`Onboarding started for client ${clientId}`);
  }
}
