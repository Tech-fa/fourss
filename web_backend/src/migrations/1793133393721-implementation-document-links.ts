import { MigrationInterface, QueryRunner } from "typeorm";

export class ImplementationDocumentLinks1793133393721
  implements MigrationInterface
{
  name = "ImplementationDocumentLinks1793133393721";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` ADD \`custom\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` ADD \`linked_document_ids\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` MODIFY \`clause\` varchar(128) NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE \`standard_implementation_documents\` SET \`linked_document_ids\` = CONCAT('["', \`linked_document_id\`, '"]') WHERE \`linked_document_id\` IS NOT NULL AND (\`linked_document_ids\` IS NULL OR \`linked_document_ids\` = '')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` MODIFY \`clause\` varchar(32) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` DROP COLUMN \`linked_document_ids\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_documents\` DROP COLUMN \`custom\``,
    );
  }
}
