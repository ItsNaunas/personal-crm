import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { QualificationModule } from '../qualification/qualification.module';
import { EnrichmentModule } from '../enrichment/enrichment.module';

@Module({
  imports: [QualificationModule, EnrichmentModule],
  providers: [LeadsService],
  exports: [LeadsService],
  controllers: [LeadsController],
})
export class LeadsModule {}
