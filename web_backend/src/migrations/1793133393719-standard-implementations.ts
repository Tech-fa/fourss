import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardImplementations1793133393719 implements MigrationInterface {
  name = "StandardImplementations1793133393719";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`standard_implementations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`standard_key\` varchar(64) NOT NULL, \`standard_name\` varchar(255) NOT NULL, \`status\` enum ('in_progress', 'completed') NOT NULL DEFAULT 'in_progress', \`created_by\` varchar(255) NOT NULL, \`created_at\` bigint NOT NULL, \`updated_at\` bigint NOT NULL, UNIQUE INDEX \`IDX_standard_implementations_standard_key\` (\`standard_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`standard_implementation_documents\` (\`id\` int NOT NULL AUTO_INCREMENT, \`implementation_id\` int NOT NULL, \`document_key\` varchar(128) NOT NULL, \`title\` varchar(255) NOT NULL, \`clause\` varchar(32) NOT NULL, \`description\` text NOT NULL, \`kind\` enum ('maintain', 'retain') NOT NULL, \`status\` enum ('not_started', 'in_progress', 'implemented') NOT NULL DEFAULT 'not_started', \`linked_document_id\` varchar(255) NULL, \`sort_order\` int NOT NULL, \`updated_at\` bigint NOT NULL, UNIQUE INDEX \`UQ_implementation_document_key\` (\`implementation_id\`, \`document_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementations\` ADD CONSTRAINT \`FK_standard_implementations_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` ADD CONSTRAINT \`FK_standard_implementation_documents_implementation\` FOREIGN KEY (\`implementation_id\`) REFERENCES \`standard_implementations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` ADD CONSTRAINT \`FK_standard_implementation_documents_linked_document\` FOREIGN KEY (\`linked_document_id\`) REFERENCES \`documents\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` DROP FOREIGN KEY \`FK_standard_implementation_documents_linked_document\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` DROP FOREIGN KEY \`FK_standard_implementation_documents_implementation\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementations\` DROP FOREIGN KEY \`FK_standard_implementations_created_by\``,
    );
    await queryRunner.query(`DROP TABLE \`standard_implementation_documents\``);
    await queryRunner.query(`DROP TABLE \`standard_implementations\``);
  }
}
