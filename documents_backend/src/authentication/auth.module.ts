import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from '../util/constants';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { Otp } from '../user/otp.entity';
import { UsersModule } from '../user/user.module';
import { TeamModule } from '../teams/team.module';
import { QueueModule } from '../queue/queue.module';
import { PermissionModule } from '../permissions/permission.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Otp]),
    UsersModule,
    TeamModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret || 'secret',
      signOptions: {
        expiresIn: process.env.NODE_ENV === 'production' ? '30m' : '24h',
      },
    }),
    QueueModule,
    PermissionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
