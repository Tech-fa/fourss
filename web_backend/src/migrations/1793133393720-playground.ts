import { MigrationInterface, QueryRunner } from "typeorm";

export class Playground1793133393720 implements MigrationInterface {
  name = "Playground1793133393720";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`playgrounds\` (\`id\` varchar(255) NOT NULL, \`team_id\` int NOT NULL, \`name\` varchar(255) NOT NULL, \`source\` mediumtext NOT NULL, \`revision\` int NOT NULL DEFAULT 0, \`created_by\` varchar(255) NOT NULL, \`publisher_id\` varchar(255) NULL, \`enabled\` tinyint NOT NULL DEFAULT 0, \`last_published_at\` bigint NULL, \`created_at\` bigint NOT NULL, \`updated_at\` bigint NOT NULL, \`deleted\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_playgrounds_team\` (\`team_id\`), INDEX \`IDX_playgrounds_team_published\` (\`team_id\`, \`last_published_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`playground_records\` (\`id\` varchar(255) NOT NULL, \`playground_id\` varchar(255) NOT NULL, \`team_id\` int NOT NULL, \`entity_type\` varchar(64) NOT NULL, \`data\` json NOT NULL, \`created_by\` varchar(255) NOT NULL, \`created_at\` bigint NOT NULL, \`updated_at\` bigint NOT NULL, \`deleted\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_playground_records_kind\` (\`playground_id\`, \`entity_type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`playground_references\` (\`id\` int NOT NULL AUTO_INCREMENT, \`playground_id\` varchar(255) NOT NULL, \`from_record_id\` varchar(255) NOT NULL, \`entity_type\` varchar(64) NOT NULL, \`entity_id\` varchar(255) NOT NULL, INDEX \`IDX_playground_references_target\` (\`entity_type\`, \`entity_id\`), INDEX \`IDX_playground_references_from\` (\`from_record_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` ADD CONSTRAINT \`FK_playgrounds_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` ADD CONSTRAINT \`FK_playgrounds_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` ADD CONSTRAINT \`FK_playgrounds_publisher\` FOREIGN KEY (\`publisher_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` ADD CONSTRAINT \`FK_playground_records_playground\` FOREIGN KEY (\`playground_id\`) REFERENCES \`playgrounds\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` ADD CONSTRAINT \`FK_playground_records_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` ADD CONSTRAINT \`FK_playground_records_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_references\` ADD CONSTRAINT \`FK_playground_references_playground\` FOREIGN KEY (\`playground_id\`) REFERENCES \`playgrounds\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_references\` ADD CONSTRAINT \`FK_playground_references_from_record\` FOREIGN KEY (\`from_record_id\`) REFERENCES \`playground_records\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`playground_references\` DROP FOREIGN KEY \`FK_playground_references_from_record\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_references\` DROP FOREIGN KEY \`FK_playground_references_playground\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` DROP FOREIGN KEY \`FK_playground_records_created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` DROP FOREIGN KEY \`FK_playground_records_team\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playground_records\` DROP FOREIGN KEY \`FK_playground_records_playground\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` DROP FOREIGN KEY \`FK_playgrounds_publisher\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` DROP FOREIGN KEY \`FK_playgrounds_created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`playgrounds\` DROP FOREIGN KEY \`FK_playgrounds_team\``,
    );
    await queryRunner.query(`DROP TABLE \`playground_references\``);
    await queryRunner.query(`DROP TABLE \`playground_records\``);
    await queryRunner.query(`DROP TABLE \`playgrounds\``);
  }
}
