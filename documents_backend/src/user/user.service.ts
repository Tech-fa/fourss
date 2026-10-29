import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { userHttpError } from "./user.errors";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { User } from "./user.entity";
import { v4 as uuidv4 } from "uuid";
import * as bcrypt from "bcrypt";
import { UserDTO, UserRoleAssignmentDto, UpdateUserDTO } from "./user.dto";
import { hashPassword } from "../util/helper-util";
import { EmailType } from "../common/dto";
import { QueuePublisher } from "../queue/queue.publisher";
import { Otp } from "./otp.entity";
import { RequestContextService } from "../history/request-context.service";
import { Team } from "../teams/team.entity";
import { TeamMember } from "../teams/team-member.entity";
import { Role } from "../permissions/role.entity";
import { CacheService } from "../cache/cache.service";
import { CACHE_PREFIX } from "../permissions/dto";
import { fetchUserLinkedRecords } from "./user-linked-records";
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queuePublisher: QueuePublisher,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly requestContextService: RequestContextService,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  async findLocalesByIds(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const users = await this.userRepository.find({
      where: { id: In(ids), deleted: false },
      select: ["id", "locale"],
    });
    return Object.fromEntries(users.map((u) => [u.id, u.locale || "en"]));
  }

  async findBy(
    cond: any,
    relations: any[] = [],
    select: any = {},
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { ...cond, deleted: false },
      relations,
      select,
    });
    if (!user) throw new NotFoundException(userHttpError("USER_001"));
    return user;
  }
  async getMyTasks(userId: string) {
    return fetchUserLinkedRecords(this.dataSource, userId);
  }
  async findAllBy(cond, relations = []): Promise<User[]> {
    return await this.userRepository.find({
      where: { ...cond, deleted: false },
      relations,
      select: {
        createdBy: {
          id: true,
          fname: true,
          lname: true,
        },
        fname: true,
        lname: true,
        email: true,
        phone: true,
        officeExtension: true,
        id: true,
        isActive: true,
        isTopManagement: true,
        createdAt: true,
        deleted: true,
      },
    });
  }
  async findAllBySearch(search: string): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder("user")
      .where("user.deleted = false")
      .andWhere(
        "(LOWER(user.fname) LIKE LOWER(:search) OR " +
          "LOWER(user.lname) LIKE LOWER(:search) OR " +
          "LOWER(CONCAT(user.fname, ' ', user.lname)) LIKE LOWER(:search))",
        { search: `%${search || ""}%` },
      )
      .orderBy("user.createdAt", "DESC")
      .select([
        "user.id",
        "user.fname",
        "user.lname",
        "user.email",
        "user.phone",
        "user.isActive",
        "user.isTopManagement",
        "user.interestedPartyId",
        "user.createdAt",
        "user.deleted",
        "user.failedLogins",
        "user.verifiedAt",
      ]);

    return query.getMany();
  }

  async findMembersByTeams(teamIds: string[]): Promise<User[]> {
    const users = await this.userRepository
      .createQueryBuilder("user")
      .leftJoin("user.teamMemberships", "membership")
      .leftJoin("membership.role", "role")
      .where("user.deleted = :deleted", { deleted: false })
      .andWhere("(membership.teamId IN (:...teamIds)) OR role.name = :name", {
        teamIds,
        name: "Admin",
      })
      .distinct(true)
      .getMany();

    return users;
  }

  private async emailExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { email, deleted: false },
    });
    return !!user;
  }

  public async checkUser(email: string, password: string): Promise<User> {
    const user = await this.findBy({ email, deleted: false }, [
      "teamMemberships",
      "teamMemberships.role",
      "teamMemberships.team",
      "createdBy",
    ]);
    if (!user) {
      throw new BadRequestException(userHttpError("USER_001"));
    }
    if (!user.isActive) {
      if (user.createdBy) {
        throw new BadRequestException(userHttpError("USER_003"));
      } else {
        throw new BadRequestException(userHttpError("USER_004"));
      }
    }
    if (!user.verifiedAt) {
      throw new BadRequestException(userHttpError("USER_008"));
    }

    if (user.failedLogins >= 3) {
      throw new BadRequestException(userHttpError("USER_005"));
    }
    if (!(await bcrypt.compare(password, user.password))) {
      await this.userRepository.increment({ id: user.id }, "failedLogins", 1);
      throw new BadRequestException(userHttpError("USER_002"));
    }

    user.failedLogins = 0;
    user.lastLogin = new Date().valueOf();
    await this.userRepository.save(user);

    return user;
  }

  async inactiveUser(userId: string, action: string): Promise<void> {
    const user = await this.findBy({
      id: userId,
    });
    if (!user.verifiedAt) {
      throw new BadRequestException(userHttpError("USER_008"));
    }
    if (action === "inactive") {
      user.isActive = false;
    } else if (action === "activate") {
      user.isActive = true;
    }
    await this.userRepository.save(user);
  }

  async resetPassword(user: UpdateUserDTO, update = true): Promise<void> {
    const userDB = await this.findBy({
      email: user.email,
      deleted: false,
    });
    if (!userDB) throw new NotFoundException(userHttpError("USER_001"));
    if (update) {
      await this.updateUser(userDB.id, user);
    }
    const newPass = await hashPassword(user.password);
    await this.userRepository.update(userDB.id, {
      password: newPass,
      isActive: true,
      ...(!userDB?.verifiedAt ? { verifiedAt: new Date().valueOf() } : {}),
    });
  }

  public async updateUser(
    userId: string,
    updated: UpdateUserDTO,
    activate?: boolean,
    actor?: { id: string },
  ): Promise<{ id: string }> {
    // fetch user
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted: false },
      relations: ["createdBy"],
    });
    let updatedUser = false;
    if (!user) throw new NotFoundException(userHttpError("USER_001"));

    const oldValues = { ...user };

    if (activate) {
      user.verifiedAt = new Date().valueOf();
    }
    // apply updates
    if (updated.fname) user.fname = updated.fname;
    if (updated.lname) user.lname = updated.lname;
    if (updated.phone) user.phone = updated.phone;
    if (updated.email && user.verifiedAt && user.email !== updated.email) {
      throw new BadRequestException(userHttpError("USER_007"));
    }
    if (updated.email && user.email !== updated.email) {
      user.email = updated.email;
      updatedUser = true;
    }
    if (updated.active !== user.isActive && updated.active !== undefined) {
      if (!user.verifiedAt) {
        throw new BadRequestException(userHttpError("USER_008"));
      }
      user.isActive = updated.active;
    }
    if (
      updated.isTopManagement !== user.isTopManagement &&
      updated.isTopManagement !== undefined
    ) {
      user.isTopManagement = updated.isTopManagement;
    }

    const updateData: any = {};
    for (const key in user) {
      if (oldValues[key] !== user[key]) {
        updateData[key] = user[key];
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set(updateData)
        .where("id = :id", { id: user.id })
        .execute();

      const currentUser = this.requestContextService.getUser();
      if (currentUser) {
        this.queuePublisher.recordHistory({
          entityName: "User",
          entityId: user.id,
          oldValues,
          newValues: user,
          action: "UPDATE",
          user: currentUser,
        });
      }
    }

    if (updated.roles !== undefined) {
      for (const group of updated.roles) {
        await this.assertCanAssignRole(actor?.id, user.id, group.roleId);
      }
      await this.assignUserRoles(user.id, updated.roles, {
        replaceExisting: true,
      });
    } else if (updated.roleId !== undefined) {
      await this.assertCanAssignRole(actor?.id, user.id, updated.roleId);
      await this.assignUserMembership(user.id, updated.roleId, {
        replaceExisting: true,
      });
    }

    if (updatedUser) {
      // Check if an OTP already exists for this email
      let existingOtp = await this.otpRepository.findOne({
        where: { email: updated.email },
      });
      const code = `${Math.floor(Math.random() * 90000000) + 10000000}`;
      const created = new Date().valueOf() + 1000 * 60 * 60 * 24;

      if (existingOtp) {
        // Update existing OTP record
        existingOtp.code = code;
        existingOtp.created = created;
        await this.otpRepository.save(existingOtp);
      } else {
        await this.otpRepository.save({
          email: updated.email,
          code: code,
          created: created,
        });
      }

      const link = `${
        process.env.FRONTEND_URL
      }/activate?email=${encodeURIComponent(
        updated.email || "",
      )}&code=${encodeURIComponent(code)}`;
      this.queuePublisher.sendEmail({
        to: updated.email || "",
        type: EmailType.ACTIVATION,
        replaceString: {
          name: updated.fname,
          added_by: user.createdBy?.fname,
          link,
        },
      });
    }
    return { id: user.id };
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const memberships = await this.teamMemberRepository.find({
      where: { user: { id: userId } },
      relations: ["role"],
    });
    return memberships.some((m) => m.role?.name === "Admin");
  }

  private async assertCanAssignRole(
    actorId: string | undefined,
    targetUserId: string | undefined,
    roleId: number,
  ): Promise<void> {
    if (!actorId) {
      return;
    }
    const role = await this.roleRepository.findOne({
      where: { id: roleId, deleted: false },
    });
    if (!role) {
      throw new BadRequestException(userHttpError("USER_019"));
    }
    if (role.name !== "Admin") {
      return;
    }
    if (await this.isAdminUser(actorId)) {
      return;
    }
    if (targetUserId && (await this.isAdminUser(targetUserId))) {
      return;
    }
    throw new ForbiddenException(userHttpError("USER_023"));
  }

  /**
   * Assign memberships: Admin covers every team; otherwise one role per team.
   * When replaceExisting, clears current memberships first (with last-admin guard).
   */
  private async assignUserRoles(
    userId: string,
    roles: UserRoleAssignmentDto[],
    options: { replaceExisting?: boolean } = {},
  ): Promise<void> {
    if (!roles?.length) {
      throw new BadRequestException(userHttpError("USER_019"));
    }

    const allTeams = await this.teamRepository.find({
      where: {
        deleted: false,
      },
      order: { id: "ASC" },
    });
    if (allTeams.length === 0) {
      throw new BadRequestException(userHttpError("USER_018"));
    }
    const allTeamIds = allTeams.map((team) => team.id);

    const resolvedRoles: {
      role: Role;
      teamIds: number[];
    }[] = [];
    const teamsSeen = new Set<number>();
    let assigningAdmin = false;

    for (const roleInput of roles) {
      const role = await this.roleRepository.findOne({
        where: {
          id: roleInput.roleId,
          deleted: false,
        },
      });
      if (!role) {
        throw new BadRequestException(userHttpError("USER_019"));
      }

      let teamIds: number[];
      if (role.name === "Admin") {
        assigningAdmin = true;
        teamIds = allTeamIds;
      } else {
        teamIds = [...new Set(roleInput.teamIds || [])];
        if (!teamIds.length) {
          throw new BadRequestException(userHttpError("USER_018"));
        }
        const invalid = teamIds.filter((id) => !allTeamIds.includes(id));
        if (invalid.length) {
          throw new BadRequestException(userHttpError("USER_018"));
        }
      }

      for (const teamId of teamIds) {
        if (teamsSeen.has(teamId)) {
          throw new BadRequestException(userHttpError("USER_020"));
        }
        teamsSeen.add(teamId);
      }

      resolvedRoles.push({ role, teamIds });
    }

    if (assigningAdmin && roles.length > 1) {
      throw new BadRequestException(userHttpError("USER_020"));
    }

    if (options.replaceExisting) {
      const existingMemberships = await this.teamMemberRepository.find({
        where: { user: { id: userId } },
        relations: ["role"],
      });
      const wasAdmin = existingMemberships.some(
        (m) => m.role?.name === "Admin",
      );
      if (wasAdmin && !assigningAdmin) {
        const otherAdminCount = await this.teamMemberRepository
          .createQueryBuilder("oum")
          .innerJoin("oum.role", "pg")
          .innerJoin("oum.user", "memberUser")
          .where("pg.name = :name", { name: "Admin" })
          .andWhere("memberUser.id != :userId", { userId })
          .andWhere("memberUser.deleted = false")
          .select("DISTINCT memberUser.id")
          .getRawMany();
        if (otherAdminCount.length === 0) {
          throw new BadRequestException(userHttpError("USER_021"));
        }
      }

      await this.teamMemberRepository.delete({
        user: { id: userId },
      });
    }

    const memberships = resolvedRoles.flatMap(({ role, teamIds }) =>
      teamIds.map((teamId) =>
        this.teamMemberRepository.create({
          user: { id: userId } as User,
          userId,
          team: { id: teamId } as Team,
          teamId: teamId,
          role: { id: role.id } as Role,
          roleId: role.id,
        }),
      ),
    );
    await this.teamMemberRepository.save(memberships);
    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }

  /**
   * Assign a role: Admin → all teams; otherwise → first team.
   * When replaceExisting, clears current memberships first (with last-admin guard).
   */
  private async assignUserMembership(
    userId: string,
    roleId: number,
    options: { replaceExisting?: boolean } = {},
  ): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: {
        id: roleId,
        deleted: false,
      },
    });
    if (!role) {
      throw new BadRequestException(userHttpError("USER_019"));
    }

    const allTeams = await this.teamRepository.find({
      where: {
        deleted: false,
      },
      order: { id: "ASC" },
    });
    if (allTeams.length === 0) {
      throw new BadRequestException(userHttpError("USER_018"));
    }

    await this.assignUserRoles(
      userId,
      [
        {
          roleId,
          teamIds: role.name === "Admin" ? [] : [allTeams[0].id],
        },
      ],
      options,
    );
  }

  public async createUser(dto: UserDTO, user: any): Promise<{ id: string }> {
    const roles = dto.roles?.length
      ? dto.roles
      : dto.roleId
      ? [{ roleId: dto.roleId }]
      : [];
    if (!roles.length) {
      throw new BadRequestException(userHttpError("USER_019"));
    }

    for (const group of roles) {
      await this.assertCanAssignRole(user.id, undefined, group.roleId);
    }

    const newUser = await this.createUserObject(dto, user);
    const result = await this.userRepository.save(newUser);

    if (dto.roles?.length) {
      await this.assignUserRoles(result.id, dto.roles);
    } else {
      await this.assignUserMembership(result.id, dto.roleId!);
    }

    const userDB = await this.findBy({ id: result.id });
    if (newUser.createdBy) {
      const code = `${Math.floor(Math.random() * 90000000) + 10000000}`;
      await this.otpRepository.save({
        email: newUser.email,
        code,
        created: new Date().valueOf() + 1000 * 60 * 60 * 24,
      });
      const link = `${
        process.env.FRONTEND_URL
      }/activate?email=${encodeURIComponent(
        newUser.email,
      )}&code=${encodeURIComponent(code)}`;
      this.queuePublisher.sendEmail({
        to: newUser.email,
        type: EmailType.ACTIVATION,
        replaceString: {
          name: newUser.fname,
          added_by: newUser.createdBy.fname,
          link,
        },
      });
    }
    return { id: userDB.id };
  }

  public async unlockUser(userId: string): Promise<{ id: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, deleted: false },
    });
    if (!user) throw new NotFoundException(userHttpError("USER_001"));
    user.failedLogins = 0;
    await this.userRepository.save(user);
    return { id: user.id };
  }

  public async createUserObject(dto: UserDTO, user: any): Promise<User> {
    const emailExists = await this.emailExists(dto.email);
    if (emailExists) {
      throw new BadRequestException(userHttpError("USER_009"));
    }
    let createdBy;
    if (user.id) {
      createdBy = await this.findBy({ id: user.id });
    }
    const newUser = {
      id: uuidv4(),
      email: dto.email,
      fname: dto.fname,
      lname: dto.lname,
      password: await hashPassword(uuidv4(), true),
      createdAt: new Date().valueOf(),
      phone: dto.phone,
      createdBy: createdBy,
      failedLogins: 0,
      isTopManagement: dto.isTopManagement ?? false,
    } as User;
    return newUser;
  }

  async updateLocale(userId: string, locale: string): Promise<void> {
    await this.userRepository.update(userId, { locale });
  }

  async deleteUser(userId: string, currentUserId: string): Promise<void> {
    if (userId === currentUserId) {
      throw new BadRequestException(userHttpError("USER_022"));
    }

    const user = await this.findBy({ id: userId });
    if (!user) throw new NotFoundException(userHttpError("USER_001"));

    await this.otpRepository.delete({ email: user.email });

    await this.teamMemberRepository.delete({
      user: { id: userId },
    });

    await this.userRepository.update(userId, {
      isActive: false,
      deleted: true,
      email: `${user.email}-deleted-${new Date().valueOf()}`,
    });

    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }
}
