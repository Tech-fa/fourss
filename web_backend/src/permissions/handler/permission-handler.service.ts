import { Injectable } from "@nestjs/common";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Events, getListening } from "../../queue/queue-constants";
import { Public } from "../../util/constants";
import { PermissionService } from "../permission.service";
@Injectable()
export class PermissionHandlerService {
  constructor(private readonly permissionService: PermissionService) {}

  @RabbitSubscribe(getListening(Events.ADD_PERMISSION))
  @Public()
  async handleAddPermission(data: {
    userId: string;
    teamId: number;
    action: "created" | "deleted";
    clientId: string;
    isMember: boolean;
  }) {
    try {
      const { userId, teamId, action, isMember } = data;
      const roles = await this.permissionService.getRoles(
        isMember ? "Team Member" : "Team Owner",
      );

      if (action === "created") {
        if (roles.length > 0) {
          await this.permissionService.addRoleToUser(
            userId,
            roles[0].id,
            teamId,
          );
        }
      } else {
        await this.permissionService.removeRoleFromUser(
          userId,
          roles[0].id,
          teamId,
        );
      }
    } catch (error) {
      console.error("Failed to handle permission:", error);
    }
  }
}
