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

export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE = 'inappropriate',
  FALSE_INFO = 'false_info',
  OTHER = 'other',
}

@Entity('comment_report')
@Index('idx_comment_report_user_comment', ['user_id', 'comment_id'], { unique: true })
@Index('idx_comment_report_comment', ['comment_id'])
export class CommentReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'comment_id' })
  comment_id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'reviewed', default: false })
  reviewed: boolean;

  @Column({ type: 'int', name: 'reviewed_by', nullable: true })
  reviewed_by: number | null;

  @Column({ type: 'datetime', name: 'reviewed_at', nullable: true })
  reviewed_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Comment, (comment) => comment.id)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
