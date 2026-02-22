import { Module } from '@nestjs/common';
import { QualificationService } from './qualification.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  providers: [QualificationService],
  exports: [QualificationService],
})
export class QualificationModule {}
