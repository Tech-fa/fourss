import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './permission.service';
import { CachingModule } from '../cache/cache.module';
import { Role } from './role.entity';
import { PermissionController } from './permission.controller';
import { TeamMember } from '../teams/team-member.entity';
import { TeamModule } from '../teams/team.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, TeamMember]),
    CachingModule,
    TeamModule,
    QueueModule,
  ],
  providers: [PermissionService],
  exports: [PermissionService],
  controllers: [PermissionController],
})
export class PermissionModule {}
