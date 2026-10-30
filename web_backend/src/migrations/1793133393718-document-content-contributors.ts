import { MigrationInterface, QueryRunner } from "typeorm";

export class DocumentContentContributors1793133393718
  implements MigrationInterface
{
  name = "DocumentContentContributors1793133393718";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`document_content_contributors\` (\`id\` int NOT NULL AUTO_INCREMENT, \`document_id\` varchar(255) NOT NULL, \`user_id\` varchar(255) NOT NULL, UNIQUE INDEX \`UQ_document_content_contributors_document_user\` (\`document_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_content_contributors\` ADD CONSTRAINT \`FK_document_content_contributors_document\` FOREIGN KEY (\`document_id\`) REFERENCES \`documents\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_content_contributors\` ADD CONSTRAINT \`FK_document_content_contributors_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`document_content_contributors\` DROP FOREIGN KEY \`FK_document_content_contributors_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`document_content_contributors\` DROP FOREIGN KEY \`FK_document_content_contributors_document\``,
    );
    await queryRunner.query(`DROP TABLE \`document_content_contributors\``);
  }
}
