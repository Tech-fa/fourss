import { Module } from "@nestjs/common";
import { NotificationHandlerService } from "./notification-handler.service";
import { QueueModule } from "../../queue/queue.module";
import { CommonModule } from "../../common/common.module";
import { NotificationModule } from "../notification.module";
import { UsersModule } from "../../user/user.module";
import { PermissionModule } from "../../permissions/permission.module";
import { TeamModule } from "../../teams/team.module";
import { DocumentModule } from "../../document/document.module";
import { DocumentService } from "../../document/document.service";
import { UsersService } from "../../user/user.service";
import { PermissionService } from "../../permissions/permission.service";
import { TeamService } from "../../teams/team.service";
import { SERVICE_MAP } from "../../service-mapping/service.map";

@Module({
  imports: [
    QueueModule,
    CommonModule,
    NotificationModule,
    UsersModule,
    PermissionModule,
    TeamModule,
    DocumentModule,
  ],
  providers: [
    NotificationHandlerService,
    {
      provide: SERVICE_MAP,
      useFactory: (
        documentService: DocumentService,
        usersService: UsersService,
        permissionService: PermissionService,
        teamService: TeamService,
      ) => ({
        documents: documentService,
        user: usersService,
        permission: permissionService,
        teams: teamService,
      }),
      inject: [DocumentService, UsersService, PermissionService, TeamService],
    },
  ],
  exports: [NotificationHandlerService],
})
export class NotificationHandlerModule {}
