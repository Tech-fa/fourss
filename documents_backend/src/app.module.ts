import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { I18nModule } from "nestjs-i18n";
import * as path from "path";
import { HeaderLocaleResolver } from "./common/resolvers/header-locale.resolver";
import { TypeOrmModule } from "@nestjs/typeorm";
import dbConfiguration from "./db/database";
import { AuthModule } from "./authentication/auth.module";
import { UsersModule } from "./user/user.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./authentication/jwt-auth.gard";
import { PermissionsGuard } from "./authentication/permission.guard";
import { TeamModule } from "./teams/team.module";
import { DocumentModule } from "./document/document.module";
import { StandardsModule } from "./standards/standards.module";
import { DocumentAiIndexHandlerModule } from "./document/handler/document-ai-index-handler.module";
import { CachingModule } from "./cache/cache.module";
import { PermissionModule } from "./permissions/permission.module";
import { HistoryModule } from "./history/history.module";
import { CommonModule } from "./common/common.module";
import { EmailHandlerModule } from "./email-handler/email-handler.module";
import { QueueModule } from "./queue/queue.module";
import { NotificationModule } from "./notification/notification.module";
import { NotificationHandlerModule } from "./notification/notification-handler/notification-handler.module";
import { PermissionHandlerModule } from "./permissions/handler/permission-handler.module";
import { ScheduleModule } from "@nestjs/schedule";
import { User } from "./user/user.entity";
import { Role } from "./permissions/role.entity";
import { Team } from "./teams/team.entity";
import { TeamMember } from "./teams/team-member.entity";
import { BootstrapService } from "./bootstrap.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.override", ".env.local", ".env", ".env.aws"],
      load: [dbConfiguration],
    }),
    I18nModule.forRoot({
      fallbackLanguage: "en",
      loaderOptions: {
        path: path.join(__dirname, "/i18n/"),
        watch: true,
      },
      resolvers: [HeaderLocaleResolver],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) =>
        configService.get("database") ?? {},
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    TeamModule,
    DocumentModule,
    StandardsModule,
    DocumentAiIndexHandlerModule,
    CachingModule,
    PermissionModule,
    HistoryModule,
    CommonModule,
    EmailHandlerModule,
    QueueModule,
    NotificationModule,
    NotificationHandlerModule,
    PermissionHandlerModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Role, Team, TeamMember]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BootstrapService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
