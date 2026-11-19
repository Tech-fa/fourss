import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Audit programs are no longer scoped to teams.
 */
export class DropAuditProgramOrganizationUnits1794498890058
  implements MigrationInterface
{
  name = "DropAuditProgramOrganizationUnits1794498890058";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_program_org_units\` DROP FOREIGN KEY \`FK_8352a4ccbbdabe20e26a79463f8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_org_units\` DROP FOREIGN KEY \`FK_a725d39481d87c1228ad44a3f71\``,
    );
    await queryRunner.query(`DROP TABLE \`audit_program_org_units\``);
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` DROP FOREIGN KEY \`FK_94b9a80d4fc26d3828ff90b4ef4\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_97a3882bb0c950f6628974c9ea\` ON \`audit_programs\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` DROP COLUMN \`organization_unit_id\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` ADD \`organization_unit_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` ADD CONSTRAINT \`FK_94b9a80d4fc26d3828ff90b4ef4\` FOREIGN KEY (\`organization_unit_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_97a3882bb0c950f6628974c9ea\` ON \`audit_programs\` (\`title\`, \`organization_unit_id\`)`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_program_org_units\` (\`id\` varchar(36) NOT NULL, \`audit_program_id\` varchar(36) NOT NULL, \`organization_unit_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_org_units\` ADD CONSTRAINT \`FK_a725d39481d87c1228ad44a3f71\` FOREIGN KEY (\`audit_program_id\`) REFERENCES \`audit_programs\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_org_units\` ADD CONSTRAINT \`FK_8352a4ccbbdabe20e26a79463f8\` FOREIGN KEY (\`organization_unit_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
