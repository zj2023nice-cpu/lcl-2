import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route } from './route.entity';
import { User } from './user.entity';

export enum CommentStatus {
  ACTIVE = 'active',
  DELETED = 'deleted',
  REPORTED = 'reported',
}

@Entity('comment')
@Index('idx_comment_route', ['route_id'])
@Index('idx_comment_parent', ['parent_id'])
@Index('idx_comment_status', ['status'])
@Index('idx_comment_user', ['user_id'])
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'route_id' })
  route_id: number;

  @Column({ type: 'int', name: 'user_id' })
  user_id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', name: 'parent_id', nullable: true })
  parent_id: number | null;

  @Column({ type: 'int', name: 'reply_to_user_id', nullable: true })
  reply_to_user_id: number | null;

  @Column({ type: 'int', name: 'like_count', default: 0 })
  like_count: number;

  @Column({ type: 'int', name: 'reply_count', default: 0 })
  reply_count: number;

  @Column({ type: 'int', name: 'report_count', default: 0 })
  report_count: number;

  @Column({
    type: 'enum',
    enum: CommentStatus,
    default: CommentStatus.ACTIVE,
  })
  status: CommentStatus;

  @Column({ type: 'datetime', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'int', name: 'deleted_by', nullable: true })
  deleted_by: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Route, (route) => route.id)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Comment, (comment) => comment.replies)
  @JoinColumn({ name: 'parent_id' })
  parent: Comment | null;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies: Comment[];

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'reply_to_user_id' })
  reply_to_user: User | null;
}
