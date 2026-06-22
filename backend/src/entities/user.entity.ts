import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Gym } from './gym.entity';
import { Ascent } from './ascent.entity';
import { GradeVote } from './grade-vote.entity';
import { Route } from './route.entity';
import { UserProfile } from './user-profile.entity';
import { OperationLog } from './operation-log.entity';
import { UserFollow } from './user-follow.entity';

export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  GYM_ADMIN = 'gym_admin',
  SETTER = 'setter',
  VERIFIED_CLIMBER = 'verified_climber',
  GUEST = 'guest',
}

@Entity('user')
@Index('idx_user_gym', ['gym_id'])
@Index('idx_user_role', ['role'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GUEST,
  })
  role: UserRole;

  @Column({ type: 'int', name: 'gym_id', nullable: true })
  gym_id: number;

  @Column({ type: 'datetime', name: 'verified_at', nullable: true })
  verified_at: Date;

  @Column({ type: 'datetime', name: 'banned_until', nullable: true })
  banned_until: Date | null;

  @Column({ type: 'int', name: 'following_count', default: 0 })
  following_count: number;

  @Column({ type: 'int', name: 'follower_count', default: 0 })
  follower_count: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Gym, (gym) => gym.users)
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @OneToMany(() => Ascent, (ascent) => ascent.user)
  ascents: Ascent[];

  @OneToMany(() => GradeVote, (vote) => vote.user)
  gradeVotes: GradeVote[];

  @OneToMany(() => Route, (route) => route.setter)
  routes: Route[];

  @OneToOne(() => UserProfile, (profile) => profile.user)
  profile: UserProfile;

  @OneToMany(() => OperationLog, (log) => log.user)
  operationLogs: OperationLog[];

  @OneToMany(() => UserFollow, (follow) => follow.follower)
  following: UserFollow[];

  @OneToMany(() => UserFollow, (follow) => follow.following)
  followers: UserFollow[];
}
