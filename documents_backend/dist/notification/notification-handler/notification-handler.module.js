"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHandlerModule = void 0;
const common_1 = require("@nestjs/common");
const notification_handler_service_1 = require("./notification-handler.service");
const queue_module_1 = require("../../queue/queue.module");
const common_module_1 = require("../../common/common.module");
const notification_module_1 = require("../notification.module");
const user_module_1 = require("../../user/user.module");
const permission_module_1 = require("../../permissions/permission.module");
const team_module_1 = require("../../teams/team.module");
const document_module_1 = require("../../document/document.module");
const document_service_1 = require("../../document/document.service");
const user_service_1 = require("../../user/user.service");
const permission_service_1 = require("../../permissions/permission.service");
const team_service_1 = require("../../teams/team.service");
const service_map_1 = require("../../service-mapping/service.map");
let NotificationHandlerModule = class NotificationHandlerModule {
};
exports.NotificationHandlerModule = NotificationHandlerModule;
exports.NotificationHandlerModule = NotificationHandlerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            queue_module_1.QueueModule,
            common_module_1.CommonModule,
            notification_module_1.NotificationModule,
            user_module_1.UsersModule,
            permission_module_1.PermissionModule,
            team_module_1.TeamModule,
            document_module_1.DocumentModule,
        ],
        providers: [
            notification_handler_service_1.NotificationHandlerService,
            {
                provide: service_map_1.SERVICE_MAP,
                useFactory: (documentService, usersService, permissionService, teamService) => ({
                    documents: documentService,
                    user: usersService,
                    permission: permissionService,
                    teams: teamService,
                }),
                inject: [document_service_1.DocumentService, user_service_1.UsersService, permission_service_1.PermissionService, team_service_1.TeamService],
            },
        ],
        exports: [notification_handler_service_1.NotificationHandlerService],
    })
], NotificationHandlerModule);
//# sourceMappingURL=notification-handler.module.js.map