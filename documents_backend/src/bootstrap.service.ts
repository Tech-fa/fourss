import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { User } from "./user/user.entity";
import { Role } from "./permissions/role.entity";
import { Team } from "./teams/team.entity";
import { TeamMember } from "./teams/team-member.entity";
import { defaultRoles } from "./permissions/permissions";
import { hashPassword } from "./util/helper-util";

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultRoles();
    await this.ensureDefaultTeam();
    await this.ensureAdminUsers();
  }

  private async ensureDefaultRoles() {
    for (const role of defaultRoles) {
      const existing = await this.roleRepository.findOne({
        where: { name: role.name },
      });
      if (existing) {
        existing.permissions = role.permissions;
        existing.description = role.description;
        existing.custom = false;
        existing.deleted = false;
        await this.roleRepository.save(existing);
        this.logger.log(`Updated default role ${role.name}`);
        continue;
      }
      await this.roleRepository.save(
        this.roleRepository.create({
          name: role.name,
          permissions: role.permissions,
          description: role.description,
          custom: false,
          deleted: false,
        }),
      );
      this.logger.log(`Created default role ${role.name}`);
    }
  }

  private async ensureDefaultTeam() {
    const count = await this.teamRepository.count({
      where: { deleted: false },
    });
    if (count > 0) return;
    await this.teamRepository.save(
      this.teamRepository.create({ name: "Default", deleted: false }),
    );
    this.logger.log("Created default team");
  }

  private async ensureAdminUsers() {
    const emails = (process.env.ADMIN_EMAIL || "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const password = process.env.ADMIN_PASSWORD;
    if (!emails.length || !password) {
      this.logger.warn(
        "ADMIN_EMAIL or ADMIN_PASSWORD is unset; skipping admin user bootstrap",
      );
      return;
    }

    const adminRole = await this.roleRepository.findOne({
      where: { name: "Admin", deleted: false },
    });
    if (!adminRole) {
      this.logger.warn("Admin role is missing; skipping admin user bootstrap");
      return;
    }

    const teams = await this.teamRepository.find({
      where: { deleted: false },
      order: { id: "ASC" },
    });
    if (!teams.length) {
      this.logger.warn("No teams exist; skipping admin user bootstrap");
      return;
    }

    const hashed = await hashPassword(password);

    for (const email of emails) {
      let user = await this.userRepository.findOne({
        where: { email, deleted: false },
      });
      if (!user) {
        user = await this.userRepository.save(
          this.userRepository.create({
            id: uuidv4(),
            email,
            fname: "Admin",
            lname: "User",
            password: hashed,
            createdAt: Date.now(),
            failedLogins: 0,
            isActive: true,
            verifiedAt: Date.now(),
            deleted: false,
            locale: "en",
          }),
        );
        this.logger.log(`Created admin user ${email}`);
      }

      const memberships = await this.teamMemberRepository.find({
        where: { userId: user.id },
      });
      const memberTeamIds = new Set(memberships.map((m) => m.teamId));
      const missing = teams.filter((team) => !memberTeamIds.has(team.id));
      if (!missing.length) continue;

      await this.teamMemberRepository.save(
        missing.map((team) =>
          this.teamMemberRepository.create({
            userId: user.id,
            teamId: team.id,
            roleId: adminRole.id,
          }),
        ),
      );
      this.logger.log(`Assigned Admin role to ${email}`);
    }
  }
}
