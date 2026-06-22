import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, Like, Brackets, DataSource, EntityManager } from 'typeorm';
import { Route, RouteType, RouteStatus } from '../entities/route.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall } from '../entities/wall.entity';
import { Gym } from '../entities/gym.entity';
import { Hold, HoldType } from '../entities/hold.entity';
import { OperationLog } from '../entities/operation-log.entity';
import { RouteVersionService } from './route-version.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryArchivedRoutesDto } from './dto/query-archived-routes.dto';
import { BatchUpdateRouteStatusDto } from './dto/batch-update-route-status.dto';
import {
  RouteCsvHeaderMap,
  DEFAULT_ROUTE_HEADER_MAP,
  ROUTE_TYPE_VALUES,
  ROUTE_HOLD_TYPE_VALUES,
  isValidGrade,
  ParsedRouteRow,
  ValidatedRouteRow,
  RouteValidationFailure,
  RouteHoldError,
  RouteBatchImportParseResult,
  RouteBatchImportConfirmPayload,
  RouteBatchImportResult,
} from './dto/batch-import-route.dto';
import { parseGenericCsv } from '../common/utils/generic-csv-parser.util';

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
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
    @InjectRepository(OperationLog)
    private operationLogRepository: Repository<OperationLog>,
    private dataSource: DataSource,
    private routeVersionService: RouteVersionService,
  ) {}

  async create(wallId: number, createRouteDto: CreateRouteDto, userId?: number): Promise<Route> {
    return this.dataSource.transaction(async (em: EntityManager) => {
      const route = em.create(Route, {
        ...createRouteDto,
        wall_id: wallId,
      });
      const savedRoute = await em.save(route);

      await this.routeVersionService.createSnapshot(
        savedRoute.id,
        {
          userId,
          changeDescription: '线路创建',
          forceCreate: true,
        },
        em,
      );

      return savedRoute;
    });
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

  async update(id: number, updateRouteDto: UpdateRouteDto, userId?: number): Promise<Route> {
    return this.dataSource.transaction(async (em: EntityManager) => {
      const route = await em.findOne(Route, { where: { id } });
      if (!route) {
        throw new NotFoundException(`Route with id ${id} not found`);
      }
      Object.assign(route, updateRouteDto);
      const savedRoute = await em.save(route);

      await this.routeVersionService.createSnapshot(
        id,
        { userId },
        em,
      );

      return savedRoute;
    });
  }

  async updateStatus(id: number, status: RouteStatus, userId?: number): Promise<Route> {
    return this.dataSource.transaction(async (em: EntityManager) => {
      const route = await em.findOne(Route, { where: { id } });
      if (!route) {
        throw new NotFoundException(`Route with id ${id} not found`);
      }
      route.status = status;
      const savedRoute = await em.save(route);

      await this.routeVersionService.createSnapshot(
        id,
        { userId },
        em,
      );

      return savedRoute;
    });
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
    const updatedRouteIds: number[] = [];

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
          updatedRouteIds.push(route.id);
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
        for (const routeId of updatedRouteIds) {
          await this.routeVersionService.createSnapshot(
            routeId,
            {
              userId: user.id,
              changeDescription: '批量更新状态',
            },
            queryRunner.manager,
          );
        }

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

  async batchImportParse(
    csvContent: string,
    gymId: number,
    headerMap?: RouteCsvHeaderMap,
  ): Promise<RouteBatchImportParseResult> {
    const gym = await this.gymRepository.findOne({ where: { id: gymId } });
    if (!gym) {
      throw new NotFoundException(`Gym with id ${gymId} not found`);
    }

    const walls = await this.wallRepository.find({ where: { gym_id: gymId } });
    const wallMap = new Map(walls.map((w) => [w.id, w]));

    const effectiveHeaderMap = headerMap || DEFAULT_ROUTE_HEADER_MAP;
    const { headers, rows } = parseGenericCsv(csvContent, effectiveHeaderMap as unknown as Record<string, string>);

    if (rows.length === 0) {
      throw new BadRequestException('CSV 文件为空或格式无效');
    }

    const parsedRows: ParsedRouteRow[] = rows.map((row, idx) => ({
      lineNumber: idx + 2,
      name: row.name || '',
      type: row.type || '',
      grade: row.grade || '',
      color: row.color || '',
      wall_id: row.wall_id || '',
      setter_id: row.setter_id || '',
      tags: row.tags || '',
      length: row.length || '',
      open_date: row.open_date || '',
      planned_remove_date: row.planned_remove_date || '',
      hold_x: row.hold_x || '',
      hold_y: row.hold_y || '',
      hold_type: row.hold_type || '',
      raw: row,
    }));

    const validRows: ValidatedRouteRow[] = [];
    const failures: RouteValidationFailure[] = [];
    const holdErrors: RouteHoldError[] = [];
    let holdCount = 0;

    for (const row of parsedRows) {
      const reasons: string[] = [];

      if (!row.name || row.name.trim() === '') {
        reasons.push('线路名称不能为空');
      } else if (row.name.length > 200) {
        reasons.push('线路名称不能超过200字符');
      }

      let routeType: RouteType | null = null;
      if (!row.type || row.type.trim() === '') {
        reasons.push('线路类型不能为空');
      } else {
        const typeLower = row.type.trim().toLowerCase();
        if (ROUTE_TYPE_VALUES.includes(typeLower)) {
          routeType = typeLower as RouteType;
        } else {
          reasons.push(`线路类型无效: "${row.type}", 有效值: ${ROUTE_TYPE_VALUES.join(', ')}`);
        }
      }

      if (!row.grade || row.grade.trim() === '') {
        reasons.push('难度不能为空');
      } else if (!isValidGrade(row.grade.trim())) {
        reasons.push(`难度格式无效: "${row.grade}", 支持V等级(V0-V16)或YDS(5.6-5.15d)`);
      }

      let wallId: number | null = null;
      if (!row.wall_id || row.wall_id.trim() === '') {
        reasons.push('岩壁ID不能为空');
      } else {
        const parsedWallId = parseInt(row.wall_id, 10);
        if (isNaN(parsedWallId)) {
          reasons.push(`岩壁ID格式无效: "${row.wall_id}"`);
        } else if (!wallMap.has(parsedWallId)) {
          reasons.push(`岩壁ID ${parsedWallId} 不属于当前场馆`);
        } else {
          wallId = parsedWallId;
        }
      }

      if (row.color && row.color.length > 50) {
        reasons.push('颜色不能超过50字符');
      }

      let setterId: number | undefined;
      if (row.setter_id && row.setter_id.trim() !== '') {
        const parsedSetterId = parseInt(row.setter_id, 10);
        if (isNaN(parsedSetterId)) {
          reasons.push(`定线员ID格式无效: "${row.setter_id}"`);
        } else {
          setterId = parsedSetterId;
        }
      }

      let tags: string[] | undefined;
      if (row.tags && row.tags.trim() !== '') {
        tags = row.tags.split(/[;；]/).map((t) => t.trim()).filter((t) => t !== '');
      }

      let routeLength: number | undefined;
      if (row.length && row.length.trim() !== '') {
        const parsedLength = parseFloat(row.length);
        if (isNaN(parsedLength)) {
          reasons.push(`长度格式无效: "${row.length}"`);
        } else if (parsedLength < 0) {
          reasons.push('长度不能为负数');
        } else {
          routeLength = parsedLength;
        }
      }

      let openDate: string | undefined;
      if (row.open_date && row.open_date.trim() !== '') {
        const d = new Date(row.open_date);
        if (isNaN(d.getTime())) {
          reasons.push(`开放日期格式无效: "${row.open_date}"`);
        } else {
          openDate = row.open_date;
        }
      }

      let plannedRemoveDate: string | undefined;
      if (row.planned_remove_date && row.planned_remove_date.trim() !== '') {
        const d = new Date(row.planned_remove_date);
        if (isNaN(d.getTime())) {
          reasons.push(`计划拆除日期格式无效: "${row.planned_remove_date}"`);
        } else {
          plannedRemoveDate = row.planned_remove_date;
        }
      }

      const hasHoldX = row.hold_x && row.hold_x.trim() !== '';
      const hasHoldY = row.hold_y && row.hold_y.trim() !== '';
      const hasHoldType = row.hold_type && row.hold_type.trim() !== '';
      const holdFieldCount = [hasHoldX, hasHoldY, hasHoldType].filter(Boolean).length;
      let holdX: number | undefined;
      let holdY: number | undefined;
      let holdType: HoldType | undefined;

      if (holdFieldCount > 0 && holdFieldCount < 3) {
        const holdReason = '岩点坐标字段需同时填写 hold_x、hold_y、hold_type，或全部留空';
        reasons.push(holdReason);
        holdErrors.push({ lineNumber: row.lineNumber, reasons: [holdReason] });
      } else if (holdFieldCount === 3) {
        const holdReasons: string[] = [];

        const parsedX = parseFloat(row.hold_x);
        if (isNaN(parsedX)) {
          holdReasons.push(`hold_x 格式无效: "${row.hold_x}"`);
        } else if (parsedX < 0 || parsedX > 100) {
          holdReasons.push(`hold_x 超出范围 (0-100): ${parsedX}`);
        } else {
          holdX = parsedX;
        }

        const parsedY = parseFloat(row.hold_y);
        if (isNaN(parsedY)) {
          holdReasons.push(`hold_y 格式无效: "${row.hold_y}"`);
        } else if (parsedY < 0 || parsedY > 100) {
          holdReasons.push(`hold_y 超出范围 (0-100): ${parsedY}`);
        } else {
          holdY = parsedY;
        }

        const typeLower = row.hold_type.trim().toLowerCase();
        if (ROUTE_HOLD_TYPE_VALUES.includes(typeLower)) {
          holdType = typeLower as HoldType;
        } else {
          holdReasons.push(`hold_type 无效: "${row.hold_type}", 有效值: ${ROUTE_HOLD_TYPE_VALUES.join(', ')}`);
        }

        if (holdReasons.length > 0) {
          reasons.push(...holdReasons);
          holdErrors.push({ lineNumber: row.lineNumber, reasons: holdReasons });
        }
      }

      if (reasons.length > 0) {
        failures.push({
          lineNumber: row.lineNumber,
          row,
          reasons,
        });
      } else if (routeType && wallId) {
        validRows.push({
          lineNumber: row.lineNumber,
          name: row.name.trim(),
          type: routeType,
          grade: row.grade.trim(),
          color: row.color?.trim() || undefined,
          wall_id: wallId,
          setter_id: setterId,
          tags,
          length: routeLength,
          open_date: openDate,
          planned_remove_date: plannedRemoveDate,
          hold_x: holdX,
          hold_y: holdY,
          hold_type: holdType,
        });
        if (holdX !== undefined && holdY !== undefined && holdType !== undefined) {
          holdCount += 1;
        }
      }
    }

    return {
      totalRows: parsedRows.length,
      validCount: validRows.length,
      failureCount: failures.length,
      holdCount,
      holdErrors,
      validRows,
      failures,
      headers,
      parsedRows,
    };
  }

  async batchImportConfirm(
    payload: RouteBatchImportConfirmPayload,
    user: { id: number; role: UserRole; gym_id?: number },
    ip?: string,
  ): Promise<RouteBatchImportResult> {
    const wall = await this.wallRepository.findOne({ where: { id: payload.wall_id } });
    if (!wall) {
      throw new NotFoundException(`Wall with id ${payload.wall_id} not found`);
    }

    if (user.role !== UserRole.PLATFORM_ADMIN) {
      if (user.gym_id && wall.gym_id !== user.gym_id) {
        throw new ForbiddenException('只能导入本场馆岩壁的线路');
      }
    }

    if (payload.rows.length === 0) {
      throw new BadRequestException('没有可导入的数据');
    }

    const result: RouteBatchImportResult = {
      success: false,
      totalRows: payload.rows.length,
      successCount: 0,
      failureCount: 0,
      createdHolds: 0,
      createdRoutes: [],
      failures: [],
    };

    let createdHolds = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const row of payload.rows) {
        try {
          const routeData: Partial<Route> = {
            wall_id: row.wall_id,
            name: row.name,
            type: row.type,
            grade: row.grade,
            color: row.color || undefined,
            setter_id: row.setter_id || undefined,
            tags: row.tags || undefined,
            length: row.length || undefined,
            open_date: row.open_date ? new Date(row.open_date) : undefined,
            planned_remove_date: row.planned_remove_date ? new Date(row.planned_remove_date) : undefined,
            status: RouteStatus.DRAFTING,
          };
          const route = queryRunner.manager.create(Route, routeData as any);

          const saved = await queryRunner.manager.save(route);

          if (row.hold_x !== undefined && row.hold_y !== undefined && row.hold_type !== undefined) {
            const hold = queryRunner.manager.create(Hold, {
              route_id: saved.id,
              position_x: row.hold_x,
              position_y: row.hold_y,
              type: row.hold_type,
            });
            await queryRunner.manager.save(hold);
            createdHolds += 1;
          }

          await this.routeVersionService.createSnapshot(
            saved.id,
            {
              userId: user.id,
              changeDescription: '批量导入线路',
              forceCreate: true,
            },
            queryRunner.manager,
          );

          result.createdRoutes.push({
            id: saved.id,
            name: saved.name,
            grade: saved.grade,
            type: saved.type,
            wall_id: saved.wall_id,
          });
        } catch (err: any) {
          result.failures.push({
            lineNumber: row.lineNumber,
            reason: err?.message || '创建失败',
          });
        }
      }

      if (result.failures.length > 0) {
        await queryRunner.rollbackTransaction();
        result.success = false;
        result.successCount = 0;
        result.failureCount = result.failures.length;
      } else {
        await queryRunner.commitTransaction();
        result.success = true;
        result.successCount = result.createdRoutes.length;
        result.failureCount = 0;
        result.createdHolds = createdHolds;
      }
    } catch (error: any) {
      try {
        await queryRunner.rollbackTransaction();
      } catch {
        // ignore rollback error
      }
      result.success = false;
      result.successCount = 0;
      result.failureCount = payload.rows.length;
      result.failures.push({
        lineNumber: 0,
        reason: error?.message || '批量导入发生未知错误',
      });
    } finally {
      await queryRunner.release();
    }

    try {
      const log = this.operationLogRepository.create({
        user_id: user.id,
        action: 'batch_import_routes',
        target_type: 'route',
        details: {
          wall_id: payload.wall_id,
          total: result.totalRows,
          success_count: result.successCount,
          failure_count: result.failureCount,
          failures: result.failures,
        },
        ip_address: ip,
      });
      await this.operationLogRepository.save(log);
    } catch {
      // logging should never break the business operation
    }

    return result;
  }
}
