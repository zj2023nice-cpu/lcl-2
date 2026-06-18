import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Comment } from './comment.entity';
import { User } from './user.entity';

@Entity('comment_like')
@Index('idx_comment_like_user_comment', ['user_id', 'comment_id'], { unique: true })
@Index('idx_comment_like_comment', ['comment_id'])
export class CommentLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'comment_id' })
  comment_id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Comment, (comment) => comment.id)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
