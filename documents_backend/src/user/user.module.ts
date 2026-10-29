import { Module } from "@nestjs/common";
import { UsersService } from "./user.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserController } from "./user.controller";
import { QueueModule } from "../queue/queue.module";
import { Otp } from "./otp.entity";
import { Team } from "../teams/team.entity";
import { TeamMember } from "../teams/team-member.entity";
import { Role } from "../permissions/role.entity";
import { CachingModule } from "../cache/cache.module";
import { CommonModule } from "../common/common.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp, Team, TeamMember, Role]),
    QueueModule,
    CachingModule,
    CommonModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UserController],
})
export class UsersModule {}
