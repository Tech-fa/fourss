import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Replaces audit program target year with a start date and a duration in years.
 * Existing durations were a day count for one audit, so every current program
 * becomes a 1-year program starting 1 January UTC of its target year.
 * Down restores the year but cannot restore the old day counts.
 */
export class AuditProgramPeriod1794498890056 implements MigrationInterface {
  name = "AuditProgramPeriod1794498890056";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` ADD \`start_date\` bigint NULL`,
    );

    const programs: Array<{ id: string; target_year: number | string | null }> =
      await queryRunner.query(
        `SELECT id, target_year FROM \`audit_programs\``,
      );
    for (const program of programs) {
      const year = Number(program.target_year);
      const startDate =
        Number.isInteger(year) && year > 0 ? Date.UTC(year, 0, 1) : null;
      await queryRunner.query(
        `UPDATE \`audit_programs\` SET \`start_date\` = ?, \`duration\` = 1 WHERE id = ?`,
        [startDate, program.id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` DROP COLUMN \`target_year\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_schedule_entries\` ADD \`year\` int NULL`,
    );

    const entries: Array<{ id: string; start_date: number | string | null }> =
      await queryRunner.query(`
        SELECT e.id AS id, p.start_date AS start_date
        FROM \`audit_program_schedule_entries\` e
        INNER JOIN \`audit_programs\` p ON p.id = e.audit_program_id
      `);
    for (const entry of entries) {
      const start = entry.start_date == null ? NaN : Number(entry.start_date);
      const year = Number.isFinite(start)
        ? new Date(start).getUTCFullYear()
        : new Date().getUTCFullYear();
      await queryRunner.query(
        `UPDATE \`audit_program_schedule_entries\` SET \`year\` = ? WHERE id = ?`,
        [year, entry.id],
      );
    }

    await queryRunner.query(
      `UPDATE \`audit_program_schedule_entries\` SET \`year\` = ? WHERE \`year\` IS NULL`,
      [new Date().getUTCFullYear()],
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_schedule_entries\` MODIFY \`year\` int NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` ADD \`target_year\` int NULL`,
    );

    const programs: Array<{ id: string; start_date: number | string | null }> =
      await queryRunner.query(
        `SELECT id, start_date FROM \`audit_programs\``,
      );
    for (const program of programs) {
      const start =
        program.start_date == null ? NaN : Number(program.start_date);
      const year = Number.isFinite(start)
        ? new Date(start).getUTCFullYear()
        : null;
      await queryRunner.query(
        `UPDATE \`audit_programs\` SET \`target_year\` = ? WHERE id = ?`,
        [year, program.id],
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`audit_programs\` DROP COLUMN \`start_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_program_schedule_entries\` DROP COLUMN \`year\``,
    );
  }
}
