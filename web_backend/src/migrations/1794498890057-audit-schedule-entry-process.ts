import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Schedule entries store a process name typed by the user.
 * The previous column held a process id with no foreign key.
 */
export class AuditScheduleEntryProcess1794498890057
  implements MigrationInterface
{
  name = "AuditScheduleEntryProcess1794498890057";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_program_schedule_entries\` CHANGE \`process_id\` \`process\` varchar(255) NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_program_schedule_entries\` CHANGE \`process\` \`process_id\` varchar(255) NOT NULL`,
    );
  }
}
