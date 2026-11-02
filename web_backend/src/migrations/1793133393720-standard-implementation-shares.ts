import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardImplementationShares1793133393720
  implements MigrationInterface
{
  name = "StandardImplementationShares1793133393720";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`standard_implementation_shares\` (\`id\` varchar(36) NOT NULL, \`implementation_id\` int NOT NULL, \`recipient_email\` varchar(320) NOT NULL, \`recipient_email_hash\` char(64) NOT NULL, \`created_by\` varchar(255) NOT NULL, \`created_at\` bigint NOT NULL, \`expires_at\` bigint NOT NULL, \`revoked_at\` bigint NULL, INDEX \`IDX_standard_implementation_shares_implementation\` (\`implementation_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_shares\` ADD CONSTRAINT \`FK_standard_implementation_shares_implementation\` FOREIGN KEY (\`implementation_id\`) REFERENCES \`standard_implementations\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_shares\` ADD CONSTRAINT \`FK_standard_implementation_shares_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_shares\` DROP FOREIGN KEY \`FK_standard_implementation_shares_created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`standard_implementation_shares\` DROP FOREIGN KEY \`FK_standard_implementation_shares_implementation\``,
    );
    await queryRunner.query(`DROP TABLE \`standard_implementation_shares\``);
  }
}
