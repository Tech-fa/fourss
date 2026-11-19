import { MigrationInterface, QueryRunner } from "typeorm";

export class IntegrationProgram1794498890062 implements MigrationInterface {
  name = "IntegrationProgram1794498890062";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`integrations\` MODIFY \`status\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_revisions\` ADD \`page_html\` mediumtext NOT NULL DEFAULT ('')`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_revisions\` ADD \`page_js\` mediumtext NOT NULL DEFAULT ('')`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_schedules\` (\`integration_id\` varchar(36) NOT NULL, \`name\` varchar(64) NOT NULL, \`every_seconds\` int NOT NULL, \`next_run_at\` bigint NOT NULL, INDEX \`IDX_integration_schedules_due\` (\`next_run_at\`), PRIMARY KEY (\`integration_id\`, \`name\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_subscriptions\` (\`integration_id\` varchar(36) NOT NULL, \`event_name\` varchar(80) NOT NULL, PRIMARY KEY (\`integration_id\`, \`event_name\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_schedules\` ADD CONSTRAINT \`FK_integration_schedules_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_subscriptions\` ADD CONSTRAINT \`FK_integration_subscriptions_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`integration_subscriptions\` DROP FOREIGN KEY \`FK_integration_subscriptions_integration\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_schedules\` DROP FOREIGN KEY \`FK_integration_schedules_integration\``,
    );
    await queryRunner.query(`DROP TABLE \`integration_subscriptions\``);
    await queryRunner.query(`DROP TABLE \`integration_schedules\``);
    await queryRunner.query(`ALTER TABLE \`integration_revisions\` DROP COLUMN \`page_js\``);
    await queryRunner.query(`ALTER TABLE \`integration_revisions\` DROP COLUMN \`page_html\``);
    await queryRunner.query(`ALTER TABLE \`integrations\` MODIFY \`status\` varchar(32) NOT NULL`);
  }
}
