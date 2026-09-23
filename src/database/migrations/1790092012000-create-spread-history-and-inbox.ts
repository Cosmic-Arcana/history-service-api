import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSpreadHistoryAndInbox1790092012000 implements MigrationInterface {
  name = 'CreateSpreadHistoryAndInbox1790092012000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE inbox (
        event_id uuid PRIMARY KEY,
        event_type varchar(128) NOT NULL,
        processed_at timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE spread_history (
        spread_id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        question text NOT NULL,
        prediction text NOT NULL,
        cards jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        projected_at timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX spread_history_user_idx ON spread_history (user_id, created_at DESC, spread_id DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE spread_history');
    await queryRunner.query('DROP TABLE inbox');
  }
}
