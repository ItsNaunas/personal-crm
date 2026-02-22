import { Global, Module } from '@nestjs/common';
import { CrmEventEmitter } from './crm-event-emitter.service';

@Global()
@Module({
  providers: [CrmEventEmitter],
  exports: [CrmEventEmitter],
})
export class EventsModule {}
