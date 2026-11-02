import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document } from "../document/document.entity";
import { PermissionModule } from "../permissions/permission.module";
import { Team } from "../teams/team.entity";
import { TeamMember } from "../teams/team-member.entity";
import { User } from "../user/user.entity";
import { EntityResolver } from "./entity-resolver";
import { PlaygroundRecord } from "./playground-record.entity";
import { PlaygroundReference } from "./playground-reference.entity";
import { PlaygroundController } from "./playground.controller";
import { Playground } from "./playground.entity";
import { PlaygroundRunQueue } from "./playground-run.queue";
import { PlaygroundRunner } from "./playground-runner";
import { PlaygroundService } from "./playground.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Playground,
      PlaygroundRecord,
      PlaygroundReference,
      Document,
      User,
      Team,
      TeamMember,
    ]),
    PermissionModule,
  ],
  controllers: [PlaygroundController],
  providers: [
    PlaygroundService,
    EntityResolver,
    PlaygroundRunQueue,
    PlaygroundRunner,
  ],
  exports: [PlaygroundService],
})
export class PlaygroundModule {}
