import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inbox' })
export class InboxEntity {
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId: string;

  @Column('varchar', { name: 'event_type', length: 128 })
  eventType: string;

  @Column('timestamptz', { name: 'processed_at' })
  processedAt: Date;
}
