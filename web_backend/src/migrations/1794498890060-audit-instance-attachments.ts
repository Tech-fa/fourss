import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditInstanceAttachments1794498890060
  implements MigrationInterface
{
  name = 'AuditInstanceAttachments1794498890060';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`audit_instance_attachments\` (\`id\` varchar(36) NOT NULL, \`audit_instance_id\` varchar(255) NOT NULL, \`file_id\` varchar(36) NOT NULL, \`created_by_user_id\` varchar(255) NOT NULL, \`created_at\` bigint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` ADD CONSTRAINT \`FK_audit_instance_attachments_instance\` FOREIGN KEY (\`audit_instance_id\`) REFERENCES \`audit_instances\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` ADD CONSTRAINT \`FK_audit_instance_attachments_file\` FOREIGN KEY (\`file_id\`) REFERENCES \`files\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` ADD CONSTRAINT \`FK_audit_instance_attachments_user\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` DROP FOREIGN KEY \`FK_audit_instance_attachments_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` DROP FOREIGN KEY \`FK_audit_instance_attachments_file\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_instance_attachments\` DROP FOREIGN KEY \`FK_audit_instance_attachments_instance\``,
    );
    await queryRunner.query(`DROP TABLE \`audit_instance_attachments\``);
  }
}
