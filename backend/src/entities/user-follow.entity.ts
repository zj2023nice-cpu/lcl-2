import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_follow')
@Index('idx_follower_following', ['follower_id', 'following_id'], { unique: true })
@Index('idx_follower', ['follower_id'])
@Index('idx_following', ['following_id'])
export class UserFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'follower_id' })
  follower_id: number;

  @Column({ type: 'int', name: 'following_id' })
  following_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.following)
  @JoinColumn({ name: 'follower_id' })
  follower: User;

  @ManyToOne(() => User, (user) => user.followers)
  @JoinColumn({ name: 'following_id' })
  following: User;
}
