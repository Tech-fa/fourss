import { randomUUID } from "crypto";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditCriteriaText1794498890055 implements MigrationInterface {
  name = "AuditCriteriaText1794498890055";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_instances\` ADD \`criteria\` text NULL`,
    );
    await queryRunner.query(`
      UPDATE \`audit_instances\` ai
      INNER JOIN \`audit_criteria\` ac ON ai.audit_criteria_id = ac.id
      SET ai.criteria = CASE
        WHEN ac.description IS NOT NULL AND TRIM(ac.description) <> ''
          THEN CONCAT(ac.name, '\n', ac.description)
        ELSE ac.name
      END
    `);

    const foreignKeys: Array<{ CONSTRAINT_NAME: string }> =
      await queryRunner.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'audit_instances'
          AND COLUMN_NAME = 'audit_criteria_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `);
    for (const foreignKey of foreignKeys) {
      await queryRunner.query(
        `ALTER TABLE \`audit_instances\` DROP FOREIGN KEY \`${foreignKey.CONSTRAINT_NAME}\``,
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`audit_instances\` DROP COLUMN \`audit_criteria_id\``,
    );
    await queryRunner.query(`DROP TABLE \`audit_criteria\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`audit_criteria\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`standard_id\` varchar(255) NULL,
        \`is_default\` tinyint NOT NULL DEFAULT 0,
        \`updated_at\` bigint NOT NULL,
        \`deleted\` tinyint NOT NULL,
        UNIQUE INDEX \`IDX_audit_criteria_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE \`audit_criteria\`
      ADD CONSTRAINT \`FK_audit_criteria_standard\`
      FOREIGN KEY (\`standard_id\`) REFERENCES \`standards\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `ALTER TABLE \`audit_instances\` ADD \`audit_criteria_id\` varchar(255) NULL`,
    );

    const rows: Array<{ criteria: string }> = await queryRunner.query(`
      SELECT DISTINCT \`criteria\` AS criteria
      FROM \`audit_instances\`
      WHERE \`criteria\` IS NOT NULL AND \`criteria\` <> ''
    `);
    const usedNames = new Set<string>();
    for (const row of rows) {
      let name = row.criteria.slice(0, 255);
      if (usedNames.has(name.toLowerCase())) {
        const suffix = ` ${usedNames.size + 1}`;
        name = `${name.slice(0, 255 - suffix.length)}${suffix}`;
      }
      usedNames.add(name.toLowerCase());
      const id = randomUUID();
      await queryRunner.query(
        `INSERT INTO \`audit_criteria\` (\`id\`, \`name\`, \`is_default\`, \`updated_at\`, \`deleted\`) VALUES (?, ?, 0, ?, 0)`,
        [id, name, Date.now()],
      );
      await queryRunner.query(
        `UPDATE \`audit_instances\` SET \`audit_criteria_id\` = ? WHERE \`criteria\` = ?`,
        [id, row.criteria],
      );
    }

    await queryRunner.query(`
      ALTER TABLE \`audit_instances\`
      ADD CONSTRAINT \`FK_audit_instances_criteria\`
      FOREIGN KEY (\`audit_criteria_id\`) REFERENCES \`audit_criteria\`(\`id\`)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `ALTER TABLE \`audit_instances\` DROP COLUMN \`criteria\``,
    );
  }
}
