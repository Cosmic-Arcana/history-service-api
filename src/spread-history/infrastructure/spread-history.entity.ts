import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { SpreadCardV1 } from '@cosmic-arcana/sdk';

@Entity({ name: 'spread_history' })
export class SpreadHistoryEntity {
  @PrimaryColumn('uuid', { name: 'spread_id' })
  spreadId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('text')
  question: string;

  @Column('text')
  prediction: string;

  @Column('jsonb')
  cards: SpreadCardV1[];

  /** When the spread was created, not when it was projected: the screen orders by this. */
  @Column('timestamptz', { name: 'created_at' })
  createdAt: Date;

  @Column('timestamptz', { name: 'projected_at' })
  projectedAt: Date;

  @Column('timestamptz', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
