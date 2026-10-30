import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryModule } from '../history/history.module';
import { QueueModule } from '../queue/queue.module';
import { UserNotificationController } from './user-notification.controller';
import { UserNotificationService } from './user-notification.service';
import { UserNotification } from './entities/user-notification.entity';
import { PermissionModule } from '../permissions/permission.module';
import { TeamModule } from '../teams/team.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification]),
    HistoryModule,
    QueueModule,
    PermissionModule,
    TeamModule,
  ],
  controllers: [UserNotificationController],
  providers: [UserNotificationService],
  exports: [UserNotificationService],
})
export class NotificationModule {}
