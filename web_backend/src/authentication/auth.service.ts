import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { authHttpError } from "./auth.errors";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { randomBytes, timingSafeEqual } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { UsersService } from "../user/user.service";
import { User } from "../user/user.entity";
import {
  RegisterDTO,
  UpdateUserDTO,
  VerifyRegistrationDTO,
} from "../user/user.dto";
import {
  ActivateRequestDto,
  AuthSessionResponseDto,
  ResetPasswordRequestDto,
} from "./auth.dto";
import { Otp } from "../user/otp.entity";
import { permissionTree } from "../permissions/permissions";
import { QueuePublisher } from "../queue/queue.publisher";
import { EmailType } from "../common/dto";
import { UserRequest } from "../permissions/dto";
import { decrypt, encrypt } from "../util/helper-util";
import { TeamService } from "../teams/team.service";
import { PermissionService } from "../permissions/permission.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    private readonly queuePublisher: QueuePublisher,
    private readonly teamService: TeamService,
    private readonly permissionService: PermissionService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    return this.userService.checkUser(username, pass);
  }

  async login(user: User, locale: string) {
    await this.userService.updateLocale(user.id, locale);
    user.locale = locale;
    return {
      access_token: this.getToken(user),
      ...(await this.getUserDetails(user)),
    };
  }

  async renewToken(user: User): Promise<AuthSessionResponseDto> {
    const userDB = await this.userService.findBy({ id: user.id }, [
      "teamMemberships",
      "teamMemberships.role",
      "teamMemberships.team",
    ]);
    return {
      access_token: this.getToken(userDB),
      ...(await this.getUserDetails(userDB)),
    };
  }

  getToken(user) {
    const payload = {
      username: user.email,
      id: user.id,
      clientId: user.clientId,
    };
    return this.jwtService.sign(payload);
  }

  async register(_user: RegisterDTO) {
    throw new BadRequestException(authHttpError("AUTH_002"));
  }

  async verifyRegistration(payload: VerifyRegistrationDTO) {
    const email = payload.email.trim().toLowerCase();
    const code = String(payload.code || "").trim();
    const otp = await this.verifyCode(email, code);
    const user = await this.userService.findBy({ email, deleted: false }, [
      "createdBy",
    ]);
    if (!user || user.createdBy) {
      throw new BadRequestException(authHttpError("AUTH_002"));
    }
    if (user.isActive && user.verifiedAt) {
      throw new BadRequestException(authHttpError("AUTH_004"));
    }
    await this.otpRepository.manager.getRepository(User).update(user.id, {
      isActive: true,
      verifiedAt: Date.now(),
    });
    await this.deleteCode(otp);
    return "done";
  }

  async resendRegistrationCode(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException(authHttpError("AUTH_002"));
    }
    const user = await this.userService.findBy(
      { email: normalizedEmail, deleted: false },
      ["createdBy"],
    );
    if (!user || user.createdBy) {
      throw new BadRequestException(authHttpError("AUTH_002"));
    }
    if (user.isActive && user.verifiedAt) {
      throw new BadRequestException(authHttpError("AUTH_004"));
    }
    const code = await this.createCode(normalizedEmail);
    this.queuePublisher.publishEmail({
      to: normalizedEmail,
      type: EmailType.REGISTRATION,
      replaceString: {
        name: user.fname + " " + user.lname,
        code,
      },
    });
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(
        `Registration verification code for ${normalizedEmail}: ${code}`,
      );
    }
    return "done";
  }

  async createCode(email: string, long = false) {
    let otp = await this.otpRepository.findOne({ where: { email } });

    if (!otp) {
      otp = new Otp();
      otp.email = email;
    }

    otp.created = new Date().valueOf();
    if (long) {
      otp.created = new Date().valueOf() + 1000 * 60 * 60 * 24;
      otp.code = `${Math.floor(Math.random() * 90000000) + 10000000}`;
    } else {
      otp.code = `${Math.floor(Math.random() * 900000) + 100000}`;
    }

    await this.otpRepository.save(otp);
    return otp.code;
  }

  async createCodeForReset(email: string) {
    let user = await this.userService.findBy({ email, isActive: true }, [
      "createdBy",
    ]);
    if (!user) {
      throw new BadRequestException(authHttpError("AUTH_002"));
    }
    const code = await this.createCode(email);
    this.queuePublisher.publishEmail({
      to: email,
      type: EmailType.RESET_PASSWORD,
      replaceString: {
        code,
      },
    });

    return user.createdBy ? "needs registration" : "done";
  }

  async createCodeForActivation(email: string) {
    let user = await this.userService.findBy({ email }, ["createdBy"]);
    if (!user) {
      throw new BadRequestException(authHttpError("AUTH_002"));
    }
    this.userService.setPassword(user);
    this.queuePublisher.publishEmail({
      to: email,
      type: EmailType.ACTIVATION,
      replaceString: {
        added_by: user.createdBy?.fname + " " + user.createdBy?.lname,
        name: user.fname + " " + user.lname,
        password: user.password,
        link: `${process.env.FRONTEND_URL}/login`,
      },
    });
    return "done";
  }
  async verifyCode(email: string, code: string, timeout = 300000) {
    let otp = await this.otpRepository.findOne({
      where: { email, code },
    });
    if (!otp || +otp.created + timeout < new Date().valueOf()) {
      throw new BadRequestException(authHttpError("AUTH_003"));
    }
    return otp;
  }
  async deleteCode(otp: Otp) {
    await this.otpRepository.delete(otp);
  }

  async resetPassword(user: ResetPasswordRequestDto, code: string) {
    let otp = await this.verifyCode(user.email, code);
    await this.userService.resetPassword(user as UpdateUserDTO);
    await this.deleteCode(otp);

    return "done";
  }

  async activate(user: ActivateRequestDto) {
    let otp = await this.verifyCode(user.email, user.code, 1000 * 60 * 24 * 5);
    await this.userService.resetPassword(
      {
        email: user.email,
        password: user.password,
      } as UpdateUserDTO,
      false,
    );
    await this.deleteCode(otp);
  }

  async getUserDetails(user: User) {
    const teams = await this.teamService.findAllTeams();
    const memberships = user.teamMemberships ?? [];
    const isAdmin = memberships.some((m) => m.role?.name === "Admin");

    return {
      user: {
        id: user.id,
        locale: user.locale ?? "en",
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        isTopManagement: user.isTopManagement ?? false,
        isAdmin,
        permissions: this.resolvePermissionsForModules(user, ["all"], isAdmin),
        teams: isAdmin
          ? teams.map((t) => ({ id: t.id, name: t.name }))
          : [
              ...new Map(
                memberships.map((m) => [
                  m.teamId,
                  {
                    id: m.teamId,
                    name: m.team?.name ?? "",
                  },
                ]),
              ).values(),
            ],
      },
    };
  }

  private resolvePermissionsForModules(
    user: User,
    availableModules: string[],
    isAdmin: boolean,
  ): { subject: string; action: string }[] {
    const modulesIncludeAll = availableModules.includes("all");

    if (isAdmin) {
      return availableModules.map((subject) => ({
        subject,
        action: "manage",
      }));
    }

    const seen = new Set<string>();

    return (user.teamMemberships ?? [])
      .flatMap((m) =>
        (m.role?.permissions ?? []).map((p) => ({
          subject: p.subject,
          action: p.action,
        })),
      )
      .filter((p) => {
        if (
          !(
            modulesIncludeAll ||
            availableModules.includes(p.subject) ||
            availableModules.some((m) =>
              Object.values(permissionTree)
                .find((perm) => perm.subject == m)
                ?.submodules?.some((s) => s.subject == p.subject),
            )
          )
        ) {
          return false;
        }
        const key = `${p.subject}:${p.action}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }
}
