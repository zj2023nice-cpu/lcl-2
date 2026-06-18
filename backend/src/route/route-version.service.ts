import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Route, RouteStatus } from '../entities/route.entity';
import { Hold } from '../entities/hold.entity';
import { User, UserRole } from '../entities/user.entity';
import {
  RouteVersion,
  RouteVersionChangeType,
  RouteVersionSnapshot,
  HoldSnapshot,
} from '../entities/route-version.entity';
import { Wall } from '../entities/wall.entity';

const VERSIONED_FIELDS = ['grade', 'status', 'path_coords'] as const;
const HOLDS_FIELDS = ['position_x', 'position_y', 'type'] as const;

export interface FieldDiff {
  field: string;
  old_value: any;
  new_value: any;
}

export interface HoldsDiff {
  added: HoldSnapshot[];
  removed: HoldSnapshot[];
  modified: Array<{
    hold_id: number;
    changes: FieldDiff[];
  }>;
}

export interface VersionCompareResult {
  from_version: {
    id: number;
    version: number;
    created_at: Date;
    created_by: number | null;
    creator_name: string | null;
  };
  to_version: {
    id: number;
    version: number;
    created_at: Date;
    created_by: number | null;
    creator_name: string | null;
  };
  field_diffs: FieldDiff[];
  holds_diff: HoldsDiff;
  change_summary: string[];
}

export interface CreateSnapshotOptions {
  userId?: number;
  changeType?: RouteVersionChangeType;
  changeDescription?: string;
  changedFields?: string[];
  parentVersionId?: number;
}

@Injectable()
export class RouteVersionService {
  constructor(
    @InjectRepository(RouteVersion)
    private routeVersionRepository: Repository<RouteVersion>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    private dataSource: DataSource,
  ) {}

  async createSnapshot(routeId: number, options: CreateSnapshotOptions = {}): Promise<RouteVersion> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Route with id ${routeId} not found`);
    }

    const holds = await this.holdRepository.find({ where: { route_id: routeId } });
    const latestVersion = await this.routeVersionRepository.findOne({
      where: { route_id: routeId },
      order: { version: 'DESC' },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const holdSnapshots: HoldSnapshot[] = holds.map((h) => ({
      id: h.id,
      position_x: h.position_x,
      position_y: h.position_y,
      type: h.type,
    }));

    const snapshot: RouteVersionSnapshot = {
      name: route.name,
      type: route.type,
      grade: route.grade,
      color: route.color,
      status: route.status,
      path_coords: route.path_coords,
      tags: route.tags,
      length: route.length,
      open_date: route.open_date,
      planned_remove_date: route.planned_remove_date,
      holds: holdSnapshots,
    };

    let changeType = options.changeType;
    let changedFields = options.changedFields;

    if (!changeType && latestVersion) {
      const detection = this.detectChanges(latestVersion.snapshot, snapshot);
      changeType = detection.changeType;
      changedFields = detection.changedFields;
    }

    if (!changeType) {
      changeType = RouteVersionChangeType.MULTIPLE;
    }

    const version = this.routeVersionRepository.create({
      route_id: routeId,
      version: nextVersion,
      change_type: changeType,
      change_description: options.changeDescription || null,
      snapshot,
      changed_fields: changedFields || [],
      created_by: options.userId || null,
      parent_version_id: options.parentVersionId || (latestVersion ? latestVersion.id : null),
    });

    return this.routeVersionRepository.save(version);
  }

  private detectChanges(
    oldSnapshot: RouteVersionSnapshot,
    newSnapshot: RouteVersionSnapshot,
  ): { changeType: RouteVersionChangeType; changedFields: string[] } {
    const changedFields: string[] = [];

    for (const field of VERSIONED_FIELDS) {
      const oldVal = oldSnapshot[field];
      const newVal = newSnapshot[field];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(field);
      }
    }

    const holdsChanged = this.haveHoldsChanged(oldSnapshot.holds, newSnapshot.holds);
    if (holdsChanged) {
      changedFields.push('holds');
    }

    let changeType: RouteVersionChangeType;
    if (changedFields.length === 0) {
      changeType = RouteVersionChangeType.MULTIPLE;
    } else if (changedFields.length === 1) {
      const field = changedFields[0];
      if (field === 'grade') changeType = RouteVersionChangeType.GRADE;
      else if (field === 'status') changeType = RouteVersionChangeType.STATUS;
      else if (field === 'path_coords') changeType = RouteVersionChangeType.PATH_COORDS;
      else if (field === 'holds') changeType = RouteVersionChangeType.HOLDS;
      else changeType = RouteVersionChangeType.MULTIPLE;
    } else {
      changeType = RouteVersionChangeType.MULTIPLE;
    }

    return { changeType, changedFields };
  }

  private haveHoldsChanged(oldHolds: HoldSnapshot[], newHolds: HoldSnapshot[]): boolean {
    if (oldHolds.length !== newHolds.length) return true;

    const oldMap = new Map(oldHolds.map((h) => [h.id, h]));
    const newMap = new Map(newHolds.map((h) => [h.id, h]));

    if (oldMap.size !== newMap.size) return true;

    for (const [id, oldHold] of oldMap) {
      const newHold = newMap.get(id);
      if (!newHold) return true;
      for (const field of HOLDS_FIELDS) {
        if (oldHold[field as keyof HoldSnapshot] !== newHold[field as keyof HoldSnapshot]) {
          return true;
        }
      }
    }

    return false;
  }

  async getVersions(routeId: number): Promise<RouteVersion[]> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Route with id ${routeId} not found`);
    }

    return this.routeVersionRepository.find({
      where: { route_id: routeId },
      order: { version: 'DESC' },
      relations: ['creator'],
    });
  }

  async getVersion(routeId: number, versionId: number): Promise<RouteVersion> {
    const version = await this.routeVersionRepository.findOne({
      where: { id: versionId, route_id: routeId },
      relations: ['creator', 'parent_version'],
    });

    if (!version) {
      throw new NotFoundException(`Version with id ${versionId} not found for route ${routeId}`);
    }

    return version;
  }

  async compareVersions(
    routeId: number,
    fromVersionId: number,
    toVersionId: number,
  ): Promise<VersionCompareResult> {
    const fromVersion = await this.getVersion(routeId, fromVersionId);
    const toVersion = await this.getVersion(routeId, toVersionId);

    const fieldDiffs: FieldDiff[] = [];

    for (const field of VERSIONED_FIELDS) {
      const oldVal = fromVersion.snapshot[field];
      const newVal = toVersion.snapshot[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        fieldDiffs.push({
          field,
          old_value: oldVal,
          new_value: newVal,
        });
      }
    }

    const holdsDiff = this.compareHolds(
      fromVersion.snapshot.holds,
      toVersion.snapshot.holds,
    );

    const changeSummary = this.buildChangeSummary(fieldDiffs, holdsDiff);

    return {
      from_version: {
        id: fromVersion.id,
        version: fromVersion.version,
        created_at: fromVersion.created_at,
        created_by: fromVersion.created_by,
        creator_name: fromVersion.creator?.name || null,
      },
      to_version: {
        id: toVersion.id,
        version: toVersion.version,
        created_at: toVersion.created_at,
        created_by: toVersion.created_by,
        creator_name: toVersion.creator?.name || null,
      },
      field_diffs: fieldDiffs,
      holds_diff: holdsDiff,
      change_summary: changeSummary,
    };
  }

  private compareHolds(oldHolds: HoldSnapshot[], newHolds: HoldSnapshot[]): HoldsDiff {
    const oldMap = new Map(oldHolds.map((h) => [h.id, h]));
    const newMap = new Map(newHolds.map((h) => [h.id, h]));

    const added: HoldSnapshot[] = [];
    const removed: HoldSnapshot[] = [];
    const modified: Array<{ hold_id: number; changes: FieldDiff[] }> = [];

    for (const [id, newHold] of newMap) {
      if (!oldMap.has(id)) {
        added.push(newHold);
      } else {
        const oldHold = oldMap.get(id)!;
        const changes: FieldDiff[] = [];
        for (const field of HOLDS_FIELDS) {
          const oldVal = oldHold[field as keyof HoldSnapshot];
          const newVal = newHold[field as keyof HoldSnapshot];
          if (oldVal !== newVal) {
            changes.push({ field, old_value: oldVal, new_value: newVal });
          }
        }
        if (changes.length > 0) {
          modified.push({ hold_id: id, changes });
        }
      }
    }

    for (const [id, oldHold] of oldMap) {
      if (!newMap.has(id)) {
        removed.push(oldHold);
      }
    }

    return { added, removed, modified };
  }

  private buildChangeSummary(fieldDiffs: FieldDiff[], holdsDiff: HoldsDiff): string[] {
    const summary: string[] = [];

    const fieldLabels: Record<string, string> = {
      grade: '难度',
      status: '状态',
      path_coords: '路径坐标',
    };

    for (const diff of fieldDiffs) {
      const label = fieldLabels[diff.field] || diff.field;
      summary.push(`${label}: ${JSON.stringify(diff.old_value)} → ${JSON.stringify(diff.new_value)}`);
    }

    if (holdsDiff.added.length > 0) {
      summary.push(`新增岩点: ${holdsDiff.added.length} 个`);
    }
    if (holdsDiff.removed.length > 0) {
      summary.push(`删除岩点: ${holdsDiff.removed.length} 个`);
    }
    if (holdsDiff.modified.length > 0) {
      summary.push(`修改岩点: ${holdsDiff.modified.length} 个`);
    }

    return summary;
  }

  async rollbackToVersion(
    routeId: number,
    targetVersionId: number,
    userId: number,
    reason?: string,
  ): Promise<RouteVersion> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Route with id ${routeId} not found`);
    }

    const targetVersion = await this.getVersion(routeId, targetVersionId);

    if (route.status === RouteStatus.REMOVED) {
      throw new BadRequestException('Cannot rollback a removed route');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const snapshot = targetVersion.snapshot;

      await queryRunner.manager.update(
        Route,
        { id: routeId },
        {
          name: snapshot.name,
          type: snapshot.type,
          grade: snapshot.grade,
          color: snapshot.color,
          status: snapshot.status,
          path_coords: snapshot.path_coords,
          tags: snapshot.tags,
          length: snapshot.length,
          open_date: snapshot.open_date,
          planned_remove_date: snapshot.planned_remove_date,
        },
      );

      await queryRunner.manager.delete(Hold, { route_id: routeId });

      const newHolds = snapshot.holds.map((h) =>
        queryRunner.manager.create(Hold, {
          route_id: routeId,
          position_x: h.position_x,
          position_y: h.position_y,
          type: h.type as any,
        }),
      );

      if (newHolds.length > 0) {
        await queryRunner.manager.save(newHolds);
      }

      await queryRunner.commitTransaction();

      const rollbackDesc = reason
        ? `回滚到版本 v${targetVersion.version}: ${reason}`
        : `回滚到版本 v${targetVersion.version}`;

      const newVersion = await this.createSnapshot(routeId, {
        userId,
        changeType: RouteVersionChangeType.ROLLBACK,
        changeDescription: rollbackDesc,
        changedFields: targetVersion.changed_fields,
        parentVersionId: targetVersion.id,
      });

      return newVersion;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async canEditRoute(routeId: number, user: { id: number; role: UserRole; gym_id?: number }): Promise<boolean> {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException(`Route with id ${routeId} not found`);
    }

    if (user.role === UserRole.SETTER) {
      return route.setter_id === user.id;
    }

    if (user.role === UserRole.GYM_ADMIN) {
      const wall = await this.wallRepository.findOne({ where: { id: route.wall_id } });
      if (!wall) {
        return false;
      }
      return wall.gym_id === user.gym_id;
    }

    return false;
  }

  async checkCanEditRoute(routeId: number, user: { id: number; role: UserRole; gym_id?: number }): Promise<void> {
    const canEdit = await this.canEditRoute(routeId, user);
    if (!canEdit) {
      throw new ForbiddenException('You do not have permission to edit this route');
    }
  }
}
