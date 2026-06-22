import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Gym } from './gym.entity';

export interface TimeSegment {
  open: string;
  close: string;
}

export interface SpecialDateConfig {
  date: string;
  is_closed: boolean;
  segments: TimeSegment[];
  note: string;
}

export interface TemporaryClosure {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  message: string;
  created_at: string;
}

@Entity('gym_business_hours')
@Index('idx_business_hours_gym', ['gym_id'])
export class GymBusinessHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'gym_id', unique: true })
  gym_id: number;

  @Column({ type: 'json', name: 'weekly_schedule', nullable: true })
  weekly_schedule: TimeSegment[][];

  @Column({ type: 'json', name: 'special_dates', nullable: true })
  special_dates: SpecialDateConfig[];

  @Column({ type: 'json', name: 'temporary_closures', nullable: true })
  temporary_closures: TemporaryClosure[];

  @Column({ type: 'varchar', length: 50, name: 'timezone', default: 'Asia/Shanghai' })
  timezone: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToOne(() => Gym)
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;
}
