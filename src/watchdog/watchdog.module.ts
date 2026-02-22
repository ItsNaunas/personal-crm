import { Module } from '@nestjs/common';
import { WatchdogService } from './watchdog.service';

@Module({
  providers: [WatchdogService],
  exports: [WatchdogService],
})
export class WatchdogModule {}
