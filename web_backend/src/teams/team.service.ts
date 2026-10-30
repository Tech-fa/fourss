import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { teamHttpError } from './team.errors';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Team } from './team.entity';
import { CreateTeamDto, TeamModuleCountsDto } from './dtos';
import { User } from '../user/user.entity';
import { TeamMember } from './team-member.entity';
import { UsersService } from '../user/user.service';
import { CacheService } from '../cache/cache.service';
import { CACHE_PREFIX } from '../permissions/dto';
import { Role } from '../permissions/role.entity';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly userService: UsersService,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  async createTeam(dto: CreateTeamDto, user: any): Promise<Partial<Team>> {
    let team = new Team();
    team.name = dto.name;
    team = await this.teamRepository.save(team);

    await this.addAdminsToTeam(team.id);
    await this.syncTeamMemberships(team.id, dto.members, true);
    await this.assertAtLeastOneAdmin();

    await this.cacheService.evictData(
      `${CACHE_PREFIX}_user_${user.id}`,
    );
    return { id: team.id };
  }

  async findById(id: number): Promise<Team | null> {
    return this.teamRepository.findOne({
      where: { id },
    });
  }

  async updateTeam(
    id: number,
    dto: CreateTeamDto,
    user: any,
  ): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(teamHttpError('TEAM_002'));
    }
    team.name = dto.name;
    const saved = await this.teamRepository.save(team);

    await this.addAdminsToTeam(saved.id);
    await this.syncTeamMemberships(
      saved.id,
      dto.members,
      dto.members !== undefined,
    );
    await this.assertAtLeastOneAdmin();

    await this.cacheService.evictData(
      `${CACHE_PREFIX}_user_${user.id}`,
    );
    return saved;
  }

  async deleteTeam(id: number, user: any): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const team = await queryRunner.manager.findOne(Team, {
        where: { id },
      });
      if (!team) {
        throw new NotFoundException(teamHttpError('TEAM_002'));
      }

      const teamCount = await queryRunner.manager.count(Team, {
        where: { deleted: false },
      });
      if (teamCount <= 1) {
        throw new BadRequestException(teamHttpError('TEAM_016'));
      }

      await queryRunner.manager.delete(TeamMember, {
        teamId: id,
      });
      await queryRunner.manager.delete(Team, id);

      await queryRunner.commitTransaction();

      await this.cacheService.evictData(
        `${CACHE_PREFIX}_user_${user.id}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to delete team: ${error.message}`, error);

      if (error.message && error.message.includes('foreign key constraint')) {
        throw new BadRequestException(teamHttpError('TEAM_007'));
      }

      throw new BadRequestException(teamHttpError('TEAM_008'));
    } finally {
      await queryRunner.release();
    }
  }

  async findAllTeams(): Promise<Team[]> {
    return this.teamRepository
      .createQueryBuilder('team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('members.role', 'role')
      .select([
        'team.id',
        'team.name',
        'members.id',
        'members.roleId',
        'user.id',
        'user.fname',
        'user.lname',
        'role.id',
        'role.name',
      ])
      .where('team.deleted = false')
      .orderBy('team.name', 'ASC')
      .getMany();
  }

  async getModuleCounts(id: number): Promise<TeamModuleCountsDto> {
    const team = await this.teamRepository.findOne({
      where: { id, deleted: false },
    });
    if (!team) {
      throw new NotFoundException(teamHttpError('TEAM_002'));
    }

    const [countsRow] = await this.dataSource.query(
      `
        SELECT COUNT(*) AS documents
        FROM documents d
        WHERE d.deleted = 0
          AND d.team_id = ?
      `,
      [id],
    );

    return {
      team: {
        id: team.id,
        name: team.name,
      },
      counts: {
        documents: Number(countsRow?.documents ?? 0),
        risks: 0,
        audits: 0,
        trainings: 0,
        kpis: 0,
        nonConformities: 0,
      },
    };
  }

  /**
   * Create/update team memberships from the payload.
   * Admin memberships on the team are never removed or reassigned here.
   * When replaceNonAdmins is true, non-admin members not in the payload are removed.
   */
  private async syncTeamMemberships(
    teamId: number,
    membersInput: CreateTeamDto['members'],
    replaceNonAdmins: boolean,
  ): Promise<void> {
    const members = (membersInput ?? []).filter((m) => m?.userId && m?.roleId);

    if (members.length === 0 && !replaceNonAdmins) {
      return;
    }

    const uniqueUserIds = new Set(members.map((m) => m.userId));
    if (uniqueUserIds.size !== members.length) {
      throw new BadRequestException(teamHttpError('TEAM_021'));
    }

    const existingOnTeam = await this.teamMemberRepository.find({
      where: { teamId },
      relations: ['role', 'user'],
    });
    const adminUserIds = new Set(
      existingOnTeam
        .filter((m) => m.role?.name === 'Admin')
        .map((m) => m.userId),
    );

    for (const entry of members) {
      if (adminUserIds.has(entry.userId)) {
        throw new BadRequestException(teamHttpError('TEAM_022'));
      }
    }

    let rolesById = new Map<number, Role>();
    let usersById = new Map<string, User>();

    if (members.length > 0) {
      const roleIds = [...new Set(members.map((m) => m.roleId))];
      const roles = await this.roleRepository.find({
        where: {
          id: In(roleIds),
          deleted: false,
        },
      });
      if (roles.length !== roleIds.length) {
        throw new BadRequestException(teamHttpError('TEAM_018'));
      }
      if (roles.some((role) => role.name === 'Admin')) {
        throw new BadRequestException(teamHttpError('TEAM_019'));
      }
      rolesById = new Map(roles.map((role) => [role.id, role]));

      const users = await this.userService.findAllBy({
        id: In([...uniqueUserIds]),
      });
      if (users.length !== uniqueUserIds.size) {
        throw new BadRequestException(teamHttpError('TEAM_020'));
      }
      usersById = new Map(users.map((u) => [u.id, u]));
    }

    const desiredUserIds = new Set(members.map((m) => m.userId));
    const touchedUserIds = new Set<string>();

    for (const entry of members) {
      const member = usersById.get(entry.userId);
      const role = rolesById.get(entry.roleId);
      if (!member || !role) {
        throw new BadRequestException(teamHttpError('TEAM_020'));
      }

      const existing = existingOnTeam.find((m) => m.userId === member.id);
      if (existing?.role?.name === 'Admin') {
        throw new BadRequestException(teamHttpError('TEAM_022'));
      }

      if (existing) {
        if (existing.roleId !== role.id) {
          existing.role = { id: role.id } as Role;
          existing.roleId = role.id;
          await this.teamMemberRepository.save(existing);
          touchedUserIds.add(member.id);
        }
        continue;
      }

      await this.teamMemberRepository.save({
        user: { id: member.id } as User,
        userId: member.id,
        team: { id: teamId } as Team,
        teamId,
        role: { id: role.id } as Role,
        roleId: role.id,
      });
      touchedUserIds.add(member.id);
    }

    if (replaceNonAdmins) {
      const toRemove = existingOnTeam.filter(
        (m) => m.role?.name !== 'Admin' && !desiredUserIds.has(m.userId),
      );
      if (toRemove.length > 0) {
        await this.teamMemberRepository.remove(toRemove);
        for (const row of toRemove) {
          touchedUserIds.add(row.userId);
        }
      }
    }

    for (const userId of touchedUserIds) {
      await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
    }
  }

  /** When a team is created/updated, every Admin user is kept on it. */
  async addAdminsToTeam(teamId: number): Promise<void> {
    const adminRole = await this.roleRepository.findOne({
      where: { name: 'Admin', deleted: false },
    });
    if (!adminRole) {
      return;
    }

    const adminRows = await this.teamMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.role', 'role')
      .innerJoin('member.user', 'user')
      .where('role.name = :name', { name: 'Admin' })
      .andWhere('user.deleted = false')
      .select('DISTINCT user.id', 'userId')
      .getRawMany<{ userId: string }>();

    for (const { userId } of adminRows) {
      const exists = await this.teamMemberRepository.findOne({
        where: {
          userId,
          teamId,
        },
        relations: ['role'],
      });
      if (exists?.role?.name === 'Admin') {
        continue;
      }
      if (exists) {
        exists.role = { id: adminRole.id } as Role;
        exists.roleId = adminRole.id;
        await this.teamMemberRepository.save(exists);
      } else {
        await this.teamMemberRepository.save({
          user: { id: userId } as User,
          userId,
          team: { id: teamId } as Team,
          teamId,
          role: { id: adminRole.id } as Role,
          roleId: adminRole.id,
        });
      }
      await this.cacheService.evictData(`${CACHE_PREFIX}_user_${userId}`);
    }
  }

  private async assertAtLeastOneAdmin(): Promise<void> {
    const adminCount = await this.teamMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.role', 'role')
      .innerJoin('member.user', 'user')
      .where('role.name = :name', { name: 'Admin' })
      .andWhere('user.deleted = false')
      .select('DISTINCT user.id')
      .getRawMany();
    if (adminCount.length === 0) {
      throw new BadRequestException(teamHttpError('TEAM_023'));
    }
  }
}
