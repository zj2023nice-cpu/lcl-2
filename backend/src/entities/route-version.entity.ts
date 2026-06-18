import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Route, RouteType, RouteStatus } from './route.entity';
import { User } from './user.entity';

export enum RouteVersionChangeType {
  GRADE = 'grade',
  HOLDS = 'holds',
  STATUS = 'status',
  PATH_COORDS = 'path_coords',
  MULTIPLE = 'multiple',
  ROLLBACK = 'rollback',
}

export interface HoldSnapshot {
  id: number;
  position_x: number;
  position_y: number;
  type: string;
}

export interface RouteVersionSnapshot {
  name: string;
  type: RouteType;
  grade: string;
  color: string | null;
  status: RouteStatus;
  path_coords: object | null;
  tags: string[] | null;
  length: number | null;
  open_date: Date | null;
  planned_remove_date: Date | null;
  holds: HoldSnapshot[];
}

@Entity('route_version')
@Index('idx_route_version_route', ['route_id'])
@Index('idx_route_version_created_by', ['created_by'])
@Index('idx_route_version_route_version', ['route_id', 'version'], { unique: true })
export class RouteVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', name: 'route_id' })
  route_id: number;

  @Column({ type: 'int' })
  version: number;

  @Column({
    type: 'enum',
    enum: RouteVersionChangeType,
  })
  change_type: RouteVersionChangeType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  change_description: string | null;

  @Column({ type: 'json' })
  snapshot: RouteVersionSnapshot;

  @Column({ type: 'simple-array', nullable: true })
  changed_fields: string[];

  @Column({ type: 'int', name: 'created_by', nullable: true })
  created_by: number | null;

  @Column({ type: 'int', name: 'parent_version_id', nullable: true })
  parent_version_id: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @ManyToOne(() => RouteVersion, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_version_id' })
  parent_version: RouteVersion | null;
}
