import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamMember } from './team-member.entity';
import { UsersModule } from '../user/user.module';
import { CachingModule } from '../cache/cache.module';
import { Role } from '../permissions/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, TeamMember, Role]),
    UsersModule,
    CachingModule,
  ],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
