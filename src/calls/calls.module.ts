import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';

@Module({
  providers: [CallsService],
  exports: [CallsService],
  controllers: [CallsController],
})
export class CallsModule {}
