import { MigrationInterface, QueryRunner } from "typeorm";

export class Integrations1794498890061 implements MigrationInterface {
  name = "Integrations1794498890061";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`integrations\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`status\` varchar(32) NOT NULL, \`accepted_revision_id\` varchar(36) NULL, \`inbound_path\` varchar(160) NULL, \`next_run_at\` bigint NULL, \`created_by\` varchar(255) NOT NULL, \`created_at\` bigint NOT NULL, \`updated_at\` bigint NOT NULL, \`deleted\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_integrations_status\` (\`status\`), INDEX \`IDX_integrations_next_run\` (\`next_run_at\`), UNIQUE INDEX \`IDX_integrations_inbound\` (\`inbound_path\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_revisions\` (\`id\` varchar(36) NOT NULL, \`integration_id\` varchar(36) NOT NULL, \`number\` int NOT NULL, \`source\` mediumtext NOT NULL, \`capabilities\` json NOT NULL, \`inputs\` json NOT NULL, \`steps\` json NOT NULL, \`status\` varchar(16) NOT NULL, \`created_at\` bigint NOT NULL, UNIQUE INDEX \`IDX_integration_revisions_number\` (\`integration_id\`, \`number\`), INDEX \`IDX_integration_revisions_integration\` (\`integration_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_values\` (\`integration_id\` varchar(36) NOT NULL, \`config_key\` varchar(64) NOT NULL, \`ciphertext\` text NOT NULL, \`secret\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`integration_id\`, \`config_key\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_state\` (\`integration_id\` varchar(36) NOT NULL, \`state_key\` varchar(128) NOT NULL, \`value\` text NOT NULL, PRIMARY KEY (\`integration_id\`, \`state_key\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_step_progress\` (\`integration_id\` varchar(36) NOT NULL, \`step_id\` varchar(64) NOT NULL, \`done_at\` bigint NOT NULL, PRIMARY KEY (\`integration_id\`, \`step_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_failures\` (\`id\` varchar(36) NOT NULL, \`integration_id\` varchar(36) NOT NULL, \`revision_id\` varchar(36) NOT NULL, \`hook\` varchar(32) NOT NULL, \`message\` text NOT NULL, \`created_at\` bigint NOT NULL, INDEX \`IDX_integration_failures_integration\` (\`integration_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`integration_leases\` (\`integration_id\` varchar(36) NOT NULL, \`owner\` varchar(64) NOT NULL, \`expires_at\` bigint NOT NULL, PRIMARY KEY (\`integration_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integrations\` ADD CONSTRAINT \`FK_integrations_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_revisions\` ADD CONSTRAINT \`FK_integration_revisions_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_values\` ADD CONSTRAINT \`FK_integration_values_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_state\` ADD CONSTRAINT \`FK_integration_state_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_step_progress\` ADD CONSTRAINT \`FK_integration_step_progress_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_failures\` ADD CONSTRAINT \`FK_integration_failures_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`integration_leases\` ADD CONSTRAINT \`FK_integration_leases_integration\` FOREIGN KEY (\`integration_id\`) REFERENCES \`integrations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`integration_leases\` DROP FOREIGN KEY \`FK_integration_leases_integration\``);
    await queryRunner.query(`ALTER TABLE \`integration_failures\` DROP FOREIGN KEY \`FK_integration_failures_integration\``);
    await queryRunner.query(`ALTER TABLE \`integration_step_progress\` DROP FOREIGN KEY \`FK_integration_step_progress_integration\``);
    await queryRunner.query(`ALTER TABLE \`integration_state\` DROP FOREIGN KEY \`FK_integration_state_integration\``);
    await queryRunner.query(`ALTER TABLE \`integration_values\` DROP FOREIGN KEY \`FK_integration_values_integration\``);
    await queryRunner.query(`ALTER TABLE \`integration_revisions\` DROP FOREIGN KEY \`FK_integration_revisions_integration\``);
    await queryRunner.query(`ALTER TABLE \`integrations\` DROP FOREIGN KEY \`FK_integrations_created_by\``);
    await queryRunner.query(`DROP TABLE \`integration_leases\``);
    await queryRunner.query(`DROP TABLE \`integration_failures\``);
    await queryRunner.query(`DROP TABLE \`integration_step_progress\``);
    await queryRunner.query(`DROP TABLE \`integration_state\``);
    await queryRunner.query(`DROP TABLE \`integration_values\``);
    await queryRunner.query(`DROP TABLE \`integration_revisions\``);
    await queryRunner.query(`DROP TABLE \`integrations\``);
  }
}
