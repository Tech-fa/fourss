import { Module } from '@nestjs/common';
import { PermissionModule } from '../permission.module';
import { QueueModule } from '../../queue/queue.module';
import { PermissionHandlerService } from './permission-handler.service';

@Module({
  imports: [PermissionModule, QueueModule],
  providers: [PermissionHandlerService],
  exports: [],
})
export class PermissionHandlerModule {}
