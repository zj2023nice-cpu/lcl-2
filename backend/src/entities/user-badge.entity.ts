import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Badge } from './badge.entity';
import { User } from './user.entity';

@Entity('user_badge')
@Index('idx_user_badge_user', ['user_id'])
@Index('idx_user_badge_badge', ['badge_id'])
@Index('idx_user_badge_unlocked', ['unlocked_at'])
export class UserBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({ type: 'int', name: 'badge_id' })
  badge_id: number;

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ type: 'boolean', default: false })
  unlocked: boolean;

  @Column({ type: 'datetime', name: 'unlocked_at', nullable: true })
  unlocked_at: Date | null;

  @Column({ type: 'boolean', default: false })
  notified: boolean;

  @Column({ type: 'simple-json', nullable: true })
  progress_details: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Badge, (badge) => badge.userBadges)
  @JoinColumn({ name: 'badge_id' })
  badge: Badge;
}
