import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Checklist definitions belong to teams, not organization units.
 */
export class ChecklistDefinitionTeams1794498890059
  implements MigrationInterface
{
  name = 'ChecklistDefinitionTeams1794498890059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_org_units\` DROP FOREIGN KEY \`FK_470b37ef982f0976368cd993439\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_org_units\` CHANGE \`organization_unit_id\` \`team_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `RENAME TABLE \`checklist_definition_org_units\` TO \`checklist_definition_teams\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_teams\` ADD CONSTRAINT \`FK_checklist_definition_teams_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` DROP FOREIGN KEY \`FK_3bbfd2ba9386f7678bdafd7e141\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` CHANGE \`organization_unit_id\` \`team_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` ADD CONSTRAINT \`FK_checklist_definitions_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` DROP FOREIGN KEY \`FK_checklist_definitions_team\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` CHANGE \`team_id\` \`organization_unit_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definitions\` ADD CONSTRAINT \`FK_3bbfd2ba9386f7678bdafd7e141\` FOREIGN KEY (\`organization_unit_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_teams\` DROP FOREIGN KEY \`FK_checklist_definition_teams_team\``,
    );
    await queryRunner.query(
      `RENAME TABLE \`checklist_definition_teams\` TO \`checklist_definition_org_units\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_org_units\` CHANGE \`team_id\` \`organization_unit_id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`checklist_definition_org_units\` ADD CONSTRAINT \`FK_470b37ef982f0976368cd993439\` FOREIGN KEY (\`organization_unit_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
