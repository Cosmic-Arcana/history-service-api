import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpreadHistoryDeletedAt1790092910000 implements MigrationInterface {
  name = 'AddSpreadHistoryDeletedAt1790092910000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE spread_history ADD COLUMN deleted_at timestamptz NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE spread_history DROP COLUMN deleted_at');
  }
}
