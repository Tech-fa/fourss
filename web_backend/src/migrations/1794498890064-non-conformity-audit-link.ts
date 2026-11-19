import { MigrationInterface, QueryRunner } from 'typeorm';

export class NonConformityAuditLink1794498890064 implements MigrationInterface {
  name = 'NonConformityAuditLink1794498890064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`non_conformities\` ADD \`finding_id\` varchar(36) NULL, ADD \`audit_id\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `UPDATE \`non_conformities\` nc
       INNER JOIN \`audit_findings\` f ON f.\`non_conformity\` = nc.\`id\`
       INNER JOIN \`audit_instances\` ai ON ai.\`id\` = f.\`audit_instance_id\`
       SET nc.\`finding_id\` = f.\`id\`, nc.\`audit_id\` = ai.\`audit_id\``,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_non_conformities_finding_id\` ON \`non_conformities\` (\`finding_id\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_conformities\` ADD CONSTRAINT \`FK_non_conformities_finding\` FOREIGN KEY (\`finding_id\`) REFERENCES \`audit_findings\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`non_conformities\` DROP FOREIGN KEY \`FK_non_conformities_finding\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_non_conformities_finding_id\` ON \`non_conformities\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`non_conformities\` DROP COLUMN \`audit_id\`, DROP COLUMN \`finding_id\``,
    );
  }
}
