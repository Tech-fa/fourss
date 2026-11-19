import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentDiagrams1794498890063 implements MigrationInterface {
  name = "DocumentDiagrams1794498890063";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document_drafts\` ADD \`diagrams\` json NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_versions\` ADD \`diagrams\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document_versions\` DROP COLUMN \`diagrams\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_drafts\` DROP COLUMN \`diagrams\``,
    );
  }
}
