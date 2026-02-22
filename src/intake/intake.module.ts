import { Module } from '@nestjs/common';
import { IntakeService } from './intake.service';
import { IntakeController } from './intake.controller';

@Module({
  providers: [IntakeService],
  exports: [IntakeService],
  controllers: [IntakeController],
})
export class IntakeModule {}
