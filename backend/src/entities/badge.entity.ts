import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserBadge } from './user-badge.entity';

export enum BadgeRarity {
  COMMON = 'common',
  RARE = 'rare',
  LEGENDARY = 'legendary',
}

export enum BadgeCategory {
  CLIMBING_FREQUENCY = 'climbing_frequency',
  GRADE_ACHIEVEMENT = 'grade_achievement',
  CHECKIN_STREAK = 'checkin_streak',
  SOCIAL_INTERACTION = 'social_interaction',
  SPECIAL = 'special',
}

export enum BadgeConditionType {
  TOTAL_ASCENTS = 'total_ascents',
  MAX_GRADE = 'max_grade',
  CHECKIN_STREAK = 'checkin_streak',
  FLASH_COUNT = 'flash_count',
  ONSIGHT_COUNT = 'onsight_count',
  TOTAL_COMMENTS = 'total_comments',
  TOTAL_LIKES = 'total_likes',
  ROUTES_SET = 'routes_set',
  GYM_VISITS = 'gym_visits',
  MONTHS_ACTIVE = 'months_active',
}

export interface BadgeCondition {
  type: BadgeConditionType;
  value: number;
  operator: '>=' | '==' | '<=';
}

@Entity('badge')
@Index('idx_badge_rarity', ['rarity'])
@Index('idx_badge_category', ['category'])
export class Badge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: BadgeRarity,
    default: BadgeRarity.COMMON,
  })
  rarity: BadgeRarity;

  @Column({
    type: 'enum',
    enum: BadgeCategory,
  })
  category: BadgeCategory;

  @Column({ type: 'simple-json' })
  conditions: BadgeCondition[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 7, default: '#F59E0B' })
  color: string;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => UserBadge, (userBadge) => userBadge.badge)
  userBadges: UserBadge[];
}
