import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  DEFAULT_AUDIT_REMINDER_RULE_ID,
  REMINDER_SOURCE,
} from '../reminders/reminder.logic';

export class ReminderRules1794498890062 implements MigrationInterface {
  name = 'ReminderRules1794498890062';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`reminder_rules\` (\`id\` varchar(36) NOT NULL, \`source_key\` varchar(64) NOT NULL, \`anchor_key\` varchar(64) NOT NULL, \`offset_days\` int NOT NULL, \`direction\` varchar(16) NOT NULL, \`recipient_keys\` json NOT NULL, \`status_keys\` json NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`created_at\` bigint NOT NULL, \`updated_at\` bigint NOT NULL, \`deleted\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_reminder_rules_enabled\` (\`enabled\`, \`deleted\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`reminder_deliveries\` (\`id\` varchar(36) NOT NULL, \`rule_id\` varchar(36) NOT NULL, \`source_key\` varchar(64) NOT NULL, \`entity_id\` varchar(255) NOT NULL, \`anchor_day\` varchar(10) NOT NULL, \`sent_at\` bigint NOT NULL, UNIQUE INDEX \`IDX_reminder_deliveries_once\` (\`rule_id\`, \`entity_id\`, \`anchor_day\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reminder_deliveries\` ADD CONSTRAINT \`FK_reminder_deliveries_rule\` FOREIGN KEY (\`rule_id\`) REFERENCES \`reminder_rules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    const now = Date.now();
    await queryRunner.query(
      `INSERT INTO \`reminder_rules\` (\`id\`, \`source_key\`, \`anchor_key\`, \`offset_days\`, \`direction\`, \`recipient_keys\`, \`status_keys\`, \`enabled\`, \`created_at\`, \`updated_at\`, \`deleted\`) VALUES ('${DEFAULT_AUDIT_REMINDER_RULE_ID}', '${REMINDER_SOURCE.auditInstance}', 'start_date', 1, 'before', CAST('[\"team\"]' AS JSON), CAST('[\"SCHEDULED\"]' AS JSON), 1, ${now}, ${now}, 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`reminder_deliveries\` DROP FOREIGN KEY \`FK_reminder_deliveries_rule\``,
    );
    await queryRunner.query(`DROP TABLE \`reminder_deliveries\``);
    await queryRunner.query(`DROP TABLE \`reminder_rules\``);
  }
}
