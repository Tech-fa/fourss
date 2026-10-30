import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { permissionHttpError } from "./permission.errors";
import { User } from "../user/user.entity";
import { PermissionEnum, permissions, permissionTree } from "./permissions";
import { In, Repository, SelectQueryBuilder } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CacheService } from "../cache/cache.service";
import {
  AttachRolesToUserDto,
  CACHE_PREFIX,
  DetachRolesFromUserDto,
  RoleDto,
  PermissionsDTO,
  UserRequest,
} from "./dto";
import { Role } from "./role.entity";
import { TeamService } from "../teams/team.service";
import { v4 as uuidv4 } from "uuid";
import { UserDTO } from "../user/user.dto";
import { TeamMember } from "../teams/team-member.entity";
import { Team } from "../teams/team.entity";

type CachedMembership = {
  teamId: number;
  roleId: number;
  roleName: string;
  permissions: PermissionsDTO[];
};

export type PermissionAccessCombination = {
  subject: string;
  action?: string;
};

type CachedPermissions = {
  userPermissions: CachedMembership[];
  modules: string[];
};

@Injectable()
export class PermissionService {
  private permissionMap: Record<string, any> = {};

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(TeamMember)
    private teamMemberRepository: Repository<TeamMember>,
    private cacheService: CacheService,
    private teamService: TeamService,
  ) {
    Object.values(permissions).forEach((permission) => {
      this.permissionMap[permission.subject] = permission;
    });
  }

  async hasPermissions(
    user: any,
    subject: string,
    actions: string[],
  ): Promise<{ hasPermission: boolean; teamIds: number[] }> {
    const cacheKey = `${CACHE_PREFIX}_user_${user.id}`;
    let permissionCache: CachedPermissions | null = null;
    const raw = await this.cacheService.getData(cacheKey);
    if (raw) {
      permissionCache = JSON.parse(raw);
    }

    if (!permissionCache) {
      const teamMembers = await this.teamMemberRepository.find({
        where: { user: { id: user.id } },
        relations: ["role", "team"],
      });
      const modules = ["all"];
      permissionCache = {
        modules,
        userPermissions: teamMembers.map((m) => ({
          teamId: m.teamId,
          roleId: m.roleId,
          roleName: m.role?.name,
          permissions: m.role?.permissions ?? [],
        })),
      };
      await this.cacheService.setData(
        cacheKey,
        JSON.stringify(permissionCache),
        3600 * 24,
      );
    }

    if (
      !(
        permissionCache.modules.includes(subject) ||
        permissionCache.modules.includes("all") ||
        permissionCache.modules.some((m) =>
          Object.values(permissionTree)
            .find((p) => p.subject == m)
            ?.submodules?.some((submodule) => submodule.subject === subject),
        )
      )
    ) {
      return { hasPermission: false, teamIds: [] };
    }

    const matching = permissionCache.userPermissions.filter((membership) =>
      this.membershipGrants(membership, subject, actions),
    );

    return {
      hasPermission: matching.length > 0,
      teamIds: [...new Set(matching.map((m) => m.teamId))],
    };
  }

  private membershipGrants(
    membership: CachedMembership,
    subject: string,
    actions: string[],
  ): boolean {
    if (membership.roleName === "Admin") {
      return true;
    }
    return membership.permissions.some(
      (permission) =>
        (permission.subject === subject ||
          permission.subject === "all" ||
          Object.values(permissionTree)
            .find((p) => p.subject === permission.subject)
            ?.submodules?.some((submodule) => submodule.subject === subject)) &&
        (actions.includes(permission.action) ||
          permission.action === PermissionEnum.MANAGE),
    );
  }

  async findAllTeamsByUser(user: UserRequest, subject: string): Promise<any[]> {
    const { teamIds } = await this.hasPermissions(user, subject, ["read"]);
    const units = await this.teamService.findAllTeams();
    return teamIds.map((id) => {
      const unit = units.find((u) => u.id === id);
      return {
        id,
        name: unit?.name || "",
      };
    });
  }

  async getAllPermissions(): Promise<any> {
    return permissionTree;
  }

  async getUserPermissions(userId: string): Promise<{
    roles: Array<{
      id: number;
      role: Role;
      teamIds: number[];
      user?: User;
    }>;
    user: UserDTO;
  }> {
    const memberships = await this.teamMemberRepository.find({
      where: { user: { id: userId } },
      relations: ["role", "user", "team"],
    });

    const byRole = new Map<
      number,
      {
        id: number;
        role: Role;
        teamIds: number[];
        user?: User;
      }
    >();

    for (const membership of memberships) {
      const existing = byRole.get(membership.roleId);
      if (existing) {
        if (!existing.teamIds.includes(membership.teamId)) {
          existing.teamIds.push(membership.teamId);
        }
      } else {
        byRole.set(membership.roleId, {
          id: membership.roleId,
          role: membership.role,
          teamIds: [membership.teamId],
          user: membership.user,
        });
      }
    }

    const roles = [...byRole.values()];
    let user = {} as UserDTO;
    if (memberships[0]?.user) {
      user = {
        fname: memberships[0].user.fname,
        lname: memberships[0].user.lname,
        id: memberships[0].user.id,
        email: memberships[0].user.email,
      } as UserDTO;
    }

    return { roles, user };
  }

  async createRole(createDto: RoleDto): Promise<Role> {
    const nonValidPermissions = createDto.permissions.filter((permission) => {
      const def = this.permissionMap[permission.subject];
      return (
        !def ||
        !def.actions.includes(permission.action) ||
        def.ownerOnlyActions?.includes(permission.action)
      );
    });
    if (nonValidPermissions.length > 0) {
      throw new BadRequestException(permissionHttpError("PERMISSION_002"));
    }
    const group = {
      name: createDto.name,
      permissions: createDto.permissions,
      description: createDto.description,
      custom: true,
    };
    return await this.roleRepository.save(group);
  }

  async updateRole(id: number, updateDto: RoleDto): Promise<Role> {
    const group = await this.roleRepository.findOne({
      where: { id },
    });
    if (!group || !group.custom) {
      throw new NotFoundException(permissionHttpError("PERMISSION_003"));
    }
    const nonValidPermissions = updateDto.permissions.filter((permission) => {
      const def = this.permissionMap[permission.subject];
      return (
        !def ||
        !def.actions.includes(permission.action) ||
        def.ownerOnlyActions?.includes(permission.action)
      );
    });
    if (nonValidPermissions.length > 0) {
      throw new BadRequestException(permissionHttpError("PERMISSION_002"));
    }
    await this.roleRepository.update(id, {
      name: updateDto.name,
      permissions: updateDto.permissions,
      description: updateDto.description,
    });

    const members = await this.teamMemberRepository.find({
      where: { role: { id } },
      relations: ["user"],
    });
    for (const member of members) {
      this.cacheService.evictData(`${CACHE_PREFIX}_user_${member.user.id}`);
    }

    return { id } as Role;
  }

  async getRoles(name?: string): Promise<Role[]> {
    const qb = this.roleRepository
      .createQueryBuilder("role")
      .where("role.deleted = false")
      .select([
        "role.id",
        "role.name",
        "role.permissions",
        "role.description",
        "role.custom",
      ]);

    if (name && name.trim() !== "") {
      qb.andWhere("LOWER(role.name) LIKE :name", {
        name: `%${name.toLowerCase()}%`,
      });
    }

    return await qb.getMany();
  }

  async getRole(id: number): Promise<Role> {
    const group = await this.roleRepository.findOne({
      where: { id, deleted: false },
      relations: ["teamMembers", "teamMembers.user"],
      select: {
        id: true,
        name: true,
        permissions: true,
        description: true,
        custom: true,
        teamMembers: {
          id: true,
          user: {
            id: true,
            fname: true,
            lname: true,
          },
        },
      },
    });
    if (!group) {
      throw new NotFoundException(permissionHttpError("PERMISSION_010"));
    }
    const uniqueUsers = new Map<string, TeamMember>();
    for (const member of group.teamMembers ?? []) {
      if (
        member.user &&
        !member.user.deleted &&
        !uniqueUsers.has(member.user.id)
      ) {
        uniqueUsers.set(member.user.id, member);
      }
    }
    group.teamMembers = [...uniqueUsers.values()];
    return group;
  }

  async deleteRole(id: number): Promise<void> {
    const memberCount = await this.teamMemberRepository.count({
      where: { role: { id } },
    });
    if (memberCount > 0) {
      throw new BadRequestException(permissionHttpError("PERMISSION_005"));
    }
    await this.roleRepository.update(id, {
      deleted: true,
      name: `${uuidv4()}`,
    });
  }

  async setUserRoles(
    userId: string,
    body: AttachRolesToUserDto,
  ): Promise<void> {
    const allTeams = await this.teamService.findAllTeams();
    const allTeamIds = allTeams.map((t) => t.id);
    if (allTeamIds.length === 0) {
      throw new BadRequestException(permissionHttpError("PERMISSION_015"));
    }

    const existingMemberships = await this.teamMemberRepository.find({
      where: { user: { id: userId } },
      relations: ["role"],
    });

    const existingAdmin = existingMemberships.find(
      (m) => m.role?.name === "Admin",
    );
    const adminRoleEntity = await this.roleRepository.findOne({
      where: { name: "Admin", deleted: false },
    });
    const bodyKeepsAdmin =
      !!adminRoleEntity &&
      body.roles.some((g) => g.roleId === adminRoleEntity.id);

    if (existingAdmin && !bodyKeepsAdmin) {
      const otherAdminCount = await this.teamMemberRepository
        .createQueryBuilder("oum")
        .innerJoin("oum.role", "pg")
        .innerJoin("oum.user", "user")
        .where("pg.name = :name", { name: "Admin" })
        .andWhere("user.id != :userId", { userId })
        .andWhere("user.deleted = false")
        .select("DISTINCT user.id")
        .getRawMany();
      if (otherAdminCount.length === 0) {
        throw new BadRequestException(permissionHttpError("PERMISSION_008"));
      }
    }

    const queryRunner = this.roleRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(TeamMember, {
        user: { id: userId },
      });

      const rowsToInsert: Partial<TeamMember>[] = [];
      let assigningAdmin = false;
      const teamsSeen = new Set<number>();

      for (const assignment of body.roles) {
        const { roleId } = assignment;
        const role = await this.roleRepository.findOne({
          where: { id: roleId, deleted: false },
        });
        if (!role) {
          throw new BadRequestException(permissionHttpError("PERMISSION_010"));
        }

        // Admin covers every team; other roles may cover many teams.
        // A user may only have one role per team.
        let teamIds: number[];
        if (role.name === "Admin") {
          assigningAdmin = true;
          teamIds = allTeamIds;
        } else {
          if (!assignment.teamIds?.length) {
            throw new BadRequestException(
              permissionHttpError("PERMISSION_012"),
            );
          }
          teamIds = [...new Set(assignment.teamIds)];
          const invalid = teamIds.filter((id) => !allTeamIds.includes(id));
          if (invalid.length) {
            throw new BadRequestException(
              permissionHttpError("PERMISSION_015"),
            );
          }
        }

        for (const teamId of teamIds) {
          if (teamsSeen.has(teamId)) {
            throw new BadRequestException(
              permissionHttpError("PERMISSION_017"),
            );
          }
          teamsSeen.add(teamId);
          rowsToInsert.push({
            user: { id: userId } as User,
            team: { id: teamId } as Team,
            teamId: teamId,
            role: { id: roleId } as Role,
            roleId,
          });
        }
      }

      // Admin already occupies every team; cannot combine with other roles.
      if (assigningAdmin && body.roles.length > 1) {
        throw new BadRequestException(permissionHttpError("PERMISSION_017"));
      }

      if (rowsToInsert.length === 0) {
        throw new BadRequestException(permissionHttpError("PERMISSION_016"));
      }

      await queryRunner.manager.save(TeamMember, rowsToInsert);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }

  async usersWithAccess(
    teamIds: number[],
    user: UserRequest,
    subject: string,
    allTeamIds?: boolean,
    userIds?: string,
    combination?: PermissionAccessCombination[],
  ): Promise<User[]> {
    if (teamIds.length === 0 && !allTeamIds) {
      return [];
    }
    const teams = await this.teamService.findAllTeams();
    if (allTeamIds) {
      teamIds = teams.map((t) => t.id);
    }

    if (user.id) {
      const {
        hasPermission,
        teamIds: allowedTeamIds,
      } = await this.hasPermissions(user, subject, ["read"]);
      if (!hasPermission) {
        return [];
      }
      teamIds = teamIds.filter((id) => allowedTeamIds.includes(id));
      if (!teamIds.length && !allTeamIds) {
        teamIds = allowedTeamIds;
      }
    }

    const qb = this.teamMemberRepository
      .createQueryBuilder("oum")
      .innerJoinAndSelect("oum.user", "user")
      .innerJoin("oum.role", "role")
      .where("(oum.teamId IN (:...teamIds) OR role.name = :adminName)", {
        teamIds: teamIds,
        adminName: "Admin",
      })
      .andWhere("user.deleted = :deleted", { deleted: false })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (userIds) {
      qb.andWhere("(user.id IN (:...userIds) OR role.name = :adminName)", {
        userIds: userIds.split(","),
        adminName: "Admin",
      });
    }

    this.applySubjectAndCombination(qb, subject, combination);

    const memberships = await qb.getMany();
    return memberships
      .map((m) => m.user)
      .filter(
        (u, index, self) => self.findIndex((x) => x.id === u.id) === index,
      );
  }

  async usersWithClientAccess(
    subject: string,
    combination?: PermissionAccessCombination[],
    userIds?: string,
  ): Promise<User[]> {
    const qb = this.teamMemberRepository
      .createQueryBuilder("oum")
      .innerJoinAndSelect("oum.user", "user")
      .innerJoin("oum.role", "role")
      .where("user.isActive = :isActive", { isActive: true })
      .andWhere("user.deleted = :deleted", { deleted: false });

    if (userIds) {
      qb.andWhere("user.id IN (:...userIds)", {
        userIds: userIds.split(","),
      });
    }

    this.applySubjectAndCombination(qb, subject, combination);

    const memberships = await qb.getMany();
    return memberships
      .map(
        (m) =>
          ({
            id: m.user.id,
            fname: m.user.fname,
            lname: m.user.lname,
            email: m.user.email,
          } as User),
      )
      .filter(
        (u, index, self) => self.findIndex((x) => x.id === u.id) === index,
      );
  }

  private applySubjectAndCombination(
    qb: SelectQueryBuilder<TeamMember>,
    subject: string,
    combination?: PermissionAccessCombination[],
  ): void {
    qb.andWhere(
      '(JSON_SEARCH(role.permissions, "one", :subject, NULL, "$[*].subject") IS NOT NULL OR role.name = :adminName)',
      { subject, adminName: "Admin" },
    );

    if (!combination?.length) {
      return;
    }

    const combinationConditions = combination
      .map((combo, index) =>
        combo.action
          ? `JSON_CONTAINS(role.permissions, JSON_OBJECT("action", :comboAction${index}, "subject", :comboSubject${index})) =1`
          : `JSON_SEARCH(role.permissions, "one", :comboSubject${index}, NULL, "$[*].subject") IS NOT NULL`,
      )
      .join(" AND ");
    const combinationParams: Record<string, unknown> = {
      adminName: "Admin",
    };
    combination.forEach((combo, index) => {
      combinationParams[`comboSubject${index}`] = combo.subject;
      if (combo.action) {
        combinationParams[`comboAction${index}`] = combo.action;
      }
    });
    qb.andWhere(
      `((${combinationConditions}) OR role.name = :adminName)`,
      combinationParams,
    );
  }

  async detachRolesFromUser(
    userId: string,
    body: DetachRolesFromUserDto,
  ): Promise<void> {
    const memberships = await this.teamMemberRepository.find({
      where: {
        user: { id: userId },
        role: { id: In(body.roleIds) },
      },
      relations: ["role"],
    });
    if (memberships.length === 0) {
      throw new BadRequestException(permissionHttpError("PERMISSION_013"));
    }

    const remainingCount = await this.teamMemberRepository.count({
      where: { user: { id: userId } },
    });
    if (remainingCount - memberships.length < 1) {
      throw new BadRequestException(permissionHttpError("PERMISSION_016"));
    }

    const removingAdmin = memberships.some((m) => m.role?.name === "Admin");
    if (removingAdmin) {
      const otherAdmins = await this.teamMemberRepository
        .createQueryBuilder("oum")
        .innerJoin("oum.role", "pg")
        .innerJoin("oum.user", "user")
        .where("pg.name = :name", { name: "Admin" })
        .andWhere("user.id != :userId", { userId })
        .andWhere("user.deleted = false")
        .select("DISTINCT user.id")
        .getRawMany();
      if (otherAdmins.length === 0) {
        throw new BadRequestException(permissionHttpError("PERMISSION_008"));
      }
    }

    await this.teamMemberRepository.remove(memberships);
    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }

  async addRoleToUser(
    userId: string,
    roleId: number,
    teamId: number,
  ): Promise<void> {
    const existing = await this.teamMemberRepository.findOne({
      where: {
        user: { id: userId },
        roleId: roleId,
        teamId,
      },
    });
    if (existing) {
      return;
    }
    await this.teamMemberRepository.save({
      user: { id: userId } as User,
      role: { id: roleId } as Role,
      roleId: roleId,
      team: { id: teamId } as Team,
      teamId,
    });
    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }

  async removeRoleFromUser(
    userId: string,
    roleId: number,
    teamId: number,
  ): Promise<void> {
    const membership = await this.teamMemberRepository.findOne({
      where: {
        user: { id: userId },
        roleId,
        teamId,
      },
    });
    if (!membership) {
      throw new BadRequestException(permissionHttpError("PERMISSION_013"));
    }

    const remaining = await this.teamMemberRepository.count({
      where: { user: { id: userId } },
    });
    if (remaining <= 1) {
      throw new BadRequestException(permissionHttpError("PERMISSION_016"));
    }

    await this.teamMemberRepository.remove(membership);
    await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
  }

  async getAdminUserIds(): Promise<string[]> {
    const rows = await this.teamMemberRepository
      .createQueryBuilder("oum")
      .innerJoin("oum.role", "role")
      .innerJoin("oum.user", "user")
      .where("role.name = :name", { name: "Admin" })
      .andWhere("user.deleted = :deleted", { deleted: false })
      .select("DISTINCT user.id", "userId")
      .getRawMany();
    return rows.map((row) => row.userId);
  }

  async getAdminUsers(): Promise<User[]> {
    const rows = await this.teamMemberRepository
      .createQueryBuilder("oum")
      .innerJoinAndSelect("oum.user", "user")
      .innerJoin("oum.role", "role")
      .where("role.name = :name", { name: "Admin" })
      .andWhere("user.deleted = :deleted", { deleted: false })
      .andWhere("user.isActive = :isActive", { isActive: true })
      .getMany();
    const byId = new Map<string, User>();
    for (const row of rows) {
      if (row.user?.id) {
        byId.set(row.user.id, row.user);
      }
    }
    return [...byId.values()];
  }

  /** Ensure every Admin user has a membership row for the given team. */
  async addAdminsToTeam(teamId: number): Promise<void> {
    const adminRole = await this.roleRepository.findOne({
      where: { name: "Admin", deleted: false },
    });
    if (!adminRole) {
      return;
    }
    const adminUserIds = await this.getAdminUserIds();
    for (const userId of adminUserIds) {
      await this.addRoleToUser(userId, adminRole.id, teamId);
    }
  }
}
