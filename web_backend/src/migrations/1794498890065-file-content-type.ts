import { MigrationInterface, QueryRunner } from "typeorm";

export class FileContentType1794498890065 implements MigrationInterface {
  name = "FileContentType1794498890065";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`files\` ADD \`content_type\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`files\` DROP COLUMN \`content_type\``);
  }
}
