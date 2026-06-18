import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, Like, Brackets, DataSource } from 'typeorm';
import { Route, RouteType, RouteStatus } from '../entities/route.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall } from '../entities/wall.entity';
import { OperationLog } from '../entities/operation-log.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryArchivedRoutesDto } from './dto/query-archived-routes.dto';
import { BatchUpdateRouteStatusDto } from './dto/batch-update-route-status.dto';

export interface RouteBatchPreviewItem {
  id: number;
  name: string;
  grade: string;
  color: string | null;
  type: RouteType;
  status: RouteStatus;
  wall_id: number;
  wall_name: string;
  setter_id: number | null;
  setter_name: string | null;
  is_archived: boolean;
}

export interface RouteBatchPreviewResult {
  total: number;
  routes: RouteBatchPreviewItem[];
}

export interface BatchStatusFailure {
  route_id: number;
  route_name: string;
  reason: string;
}

export interface BatchStatusResult {
  success: boolean;
  total: number;
  success_count: number;
  failure_count: number;
  failures: BatchStatusFailure[];
}

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
    private dataSource: DataSource,
  ) {}

  create(wallId: number, createRouteDto: CreateRouteDto): Promise<Route> {
    const route = this.routeRepository.create({
      ...createRouteDto,
      wall_id: wallId,
    });
    return this.routeRepository.save(route);
  }

  findAllByWall(
    wallId: number,
    filters?: {
      type?: RouteType;
      grade?: string;
      status?: RouteStatus;
      includeArchived?: boolean;
    },
  ): Promise<Route[]> {
    const options: FindManyOptions<Route> = {
      where: { wall_id: wallId } as any,
    };

    if (!filters?.includeArchived) {
      (options.where as any).isArchived = false;
    }

    if (filters?.type) {
      (options.where as any).type = filters.type;
    }
    if (filters?.grade) {
      (options.where as any).grade = filters.grade;
    }
    if (filters?.status) {
      (options.where as any).status = filters.status;
    }

    return this.routeRepository.find(options);
  }

  findOne(id: number): Promise<Route | null> {
    return this.routeRepository.findOne({ where: { id } });
  }

  async findOneForUser(
    id: number,
    user: { id: number; role: UserRole; gym_id?: number } | null,
  ): Promise<Route | null> {
    const route = await this.findOne(id);
    if (!route) return null;

    if (route.isArchived) {
      if (!user) return null;
      if (user.role === UserRole.PLATFORM_ADMIN) return route;
      if (user.role === UserRole.GYM_ADMIN && user.gym_id) {
        const wall = await this.wallRepository.findOne({ where: { id: route.wall_id } });
        if (wall && wall.gym_id === user.gym_id) return route;
      }
      return null;
    }

    return route;
  }

  async update(id: number, updateRouteDto: UpdateRouteDto): Promise<Route> {
    const route = await this.findOne(id);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
    Object.assign(route, updateRouteDto);
    return this.routeRepository.save(route);
  }

  async updateStatus(id: number, status: RouteStatus): Promise<Route> {
    const route = await this.findOne(id);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
    route.status = status;
    return this.routeRepository.save(route);
  }

  async remove(id: number): Promise<void> {
    const result = await this.routeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
  }

  async canEditRoute(routeId: number, user: { id: number; role: UserRole; gym_id?: number }): Promise<boolean> {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return true;
    }

    const route = await this.findOne(routeId);
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

  async archive(
    id: number,
    reason: string,
    userId: number,
  ): Promise<Route> {
    const route = await this.findOne(id);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
    if (route.isArchived) {
      throw new BadRequestException('Route is already archived');
    }
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Archive reason is required');
    }

    route.isArchived = true;
    route.archiveReason = reason.trim();
    route.archivedBy = userId;
    route.archivedAt = new Date();
    route.restoredBy = null;
    route.restoredAt = null;

    return this.routeRepository.save(route);
  }

  async restore(
    id: number,
    userId: number,
  ): Promise<Route> {
    const route = await this.findOne(id);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
    if (!route.isArchived) {
      throw new BadRequestException('Route is not archived');
    }

    route.isArchived = false;
    route.restoredBy = userId;
    route.restoredAt = new Date();

    return this.routeRepository.save(route);
  }

  async findArchived(
    query: QueryArchivedRoutesDto,
    user: { id: number; role: UserRole; gym_id?: number },
  ): Promise<Route[]> {
    const options: FindManyOptions<Route> = {
      where: { isArchived: true } as any,
      order: { archivedAt: 'DESC' },
    };

    const whereConditions: any[] = [{ isArchived: true }];

    if (query.reason) {
      whereConditions[0].archiveReason = Like(`%${query.reason}%`);
    }

    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      whereConditions[0].archivedAt = Between(start, end);
    } else if (query.startDate) {
      const start = new Date(query.startDate);
      whereConditions[0].archivedAt = Between(start, new Date());
    } else if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      whereConditions[0].archivedAt = Between(new Date(0), end);
    }

    if (query.archivedBy) {
      whereConditions[0].archivedBy = query.archivedBy;
    }

    if (query.wallId) {
      whereConditions[0].wall_id = query.wallId;
    }

    if (user.role !== UserRole.PLATFORM_ADMIN && user.gym_id) {
      const walls = await this.wallRepository.find({
        where: { gym_id: user.gym_id },
        select: ['id'],
      });
      const wallIds = walls.map(w => w.id);
      if (wallIds.length > 0) {
        whereConditions[0].wall_id = whereConditions[0].wall_id
          ? (wallIds.includes(whereConditions[0].wall_id) ? whereConditions[0].wall_id : -1)
          : wallIds;
      } else {
        whereConditions[0].wall_id = -1;
      }
    }

    options.where = whereConditions.length === 1 ? whereConditions[0] : whereConditions;

    return this.routeRepository.find(options);
  }

  private async resolveTargetRoutes(
    dto: BatchUpdateRouteStatusDto,
    user: { id: number; role: UserRole; gym_id?: number },
  ): Promise<Route[]> {
    const qb = this.routeRepository
      .createQueryBuilder('route')
      .leftJoinAndSelect('route.wall', 'wall')
      .leftJoinAndSelect('route.setter', 'setter');

    if (!dto.include_archived) {
      qb.andWhere('route.is_archived = :archived', { archived: false });
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      // platform admin can access all routes
    } else if (user.role === UserRole.GYM_ADMIN) {
      if (user.gym_id) {
        qb.andWhere('wall.gym_id = :gymId', { gymId: user.gym_id });
      } else {
        return [];
      }
    } else if (user.role === UserRole.SETTER) {
      qb.andWhere('route.setter_id = :setterId', { setterId: user.id });
    } else {
      return [];
    }

    const hasRouteIds = dto.route_ids && dto.route_ids.length > 0;
    if (hasRouteIds) {
      qb.andWhere('route.id IN (:...ids)', { ids: dto.route_ids });
    } else if (dto.filters) {
      const f = dto.filters;
      if (f.type) qb.andWhere('route.type = :type', { type: f.type });
      if (f.grade) qb.andWhere('route.grade = :grade', { grade: f.grade });
      if (f.status) qb.andWhere('route.status = :status', { status: f.status });
      if (f.color) qb.andWhere('route.color = :color', { color: f.color });
      if (f.wall_id) qb.andWhere('route.wall_id = :wallId', { wallId: f.wall_id });
    } else {
      return [];
    }

    return qb.getMany();
  }

  async previewBatchStatus(
    dto: BatchUpdateRouteStatusDto,
    user: { id: number; role: UserRole; gym_id?: number },
  ): Promise<RouteBatchPreviewResult> {
    const routes = await this.resolveTargetRoutes(dto, user);
    const items: RouteBatchPreviewItem[] = routes.map((route) => ({
      id: route.id,
      name: route.name,
      grade: route.grade,
      color: route.color ?? null,
      type: route.type,
      status: route.status,
      wall_id: route.wall_id,
      wall_name: route.wall?.name ?? '未知岩壁',
      setter_id: route.setter_id ?? null,
      setter_name: route.setter?.name ?? null,
      is_archived: route.isArchived,
    }));

    return {
      total: items.length,
      routes: items,
    };
  }

  async batchUpdateStatus(
    dto: BatchUpdateRouteStatusDto,
    user: { id: number; role: UserRole; gym_id?: number },
    ip?: string,
  ): Promise<BatchStatusResult> {
    const routes = await this.resolveTargetRoutes(dto, user);

    const result: BatchStatusResult = {
      success: false,
      total: routes.length,
      success_count: 0,
      failure_count: 0,
      failures: [],
    };

    if (routes.length === 0) {
      result.failure_count = 0;
      await this.logBatchOperation(user, dto, result, ip);
      return result;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const failures: BatchStatusFailure[] = [];

    try {
      for (const route of routes) {
        if (route.isArchived) {
          failures.push({
            route_id: route.id,
            route_name: route.name,
            reason: '线路已归档，不可修改状态',
          });
          continue;
        }

        if (route.status === dto.status) {
          continue;
        }

        try {
          await queryRunner.manager.update(
            Route,
            { id: route.id },
            { status: dto.status },
          );
        } catch (err: any) {
          failures.push({
            route_id: route.id,
            route_name: route.name,
            reason: err?.message || '更新失败',
          });
        }
      }

      if (failures.length > 0) {
        await queryRunner.rollbackTransaction();
        result.success = false;
        result.success_count = 0;
        result.failure_count = failures.length;
        result.failures = failures;
      } else {
        await queryRunner.commitTransaction();
        const skipped = routes.filter((r) => !r.isArchived && r.status === dto.status).length;
        result.success = true;
        result.success_count = routes.length - skipped;
        result.failure_count = 0;
      }
    } catch (error: any) {
      try {
        await queryRunner.rollbackTransaction();
      } catch {
        // ignore rollback error
      }
      result.success = false;
      result.success_count = 0;
      result.failure_count = routes.length;
      result.failures = [
        {
          route_id: 0,
          route_name: '-',
          reason: error?.message || '批量操作发生未知错误',
        },
      ];
    } finally {
      await queryRunner.release();
    }

    await this.logBatchOperation(user, dto, result, ip);

    return result;
  }

  private async logBatchOperation(
    user: { id: number; role: UserRole; gym_id?: number },
    dto: BatchUpdateRouteStatusDto,
    result: BatchStatusResult,
    ip?: string,
  ): Promise<void> {
    try {
      const log = this.operationLogRepository.create({
        user_id: user.id,
        action: 'batch_update_status',
        target_type: 'route',
        details: {
          target_status: dto.status,
          total: result.total,
          success_count: result.success_count,
          failure_count: result.failure_count,
          route_ids: dto.route_ids ?? null,
          filters: dto.filters ?? null,
          include_archived: dto.include_archived ?? false,
          failures: result.failures,
        },
        ip_address: ip,
      });
      await this.operationLogRepository.save(log);
    } catch {
      // logging should never break the business operation
    }
  }
}
