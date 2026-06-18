import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Hold, HoldType } from '../entities/hold.entity';
import { Route } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { RouteVersionService } from '../route/route-version.service';
import { RouteVersionChangeType } from '../entities/route-version.entity';
import { CreateHoldDto } from './dto/create-hold.dto';
import { UpdateHoldDto } from './dto/update-hold.dto';
import {
  ValidatedHoldRow,
  ValidationFailure,
  BatchImportResult,
  CsvHeaderMap,
  DEFAULT_HEADER_MAP,
  HOLD_TYPE_VALUES,
} from './dto/batch-import-hold.dto';
import { parseCsv, ParsedCsvRow } from '../common/utils/csv-parser.util';
import { isPointInPolygon, parsePolygonCoords, Point, getPolygonBounds, PolygonBounds } from '../common/utils/geometry.util';

const DUPLICATE_EPSILON = 0.001;

@Injectable()
export class HoldService {
  constructor(
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    private dataSource: DataSource,
    private routeVersionService: RouteVersionService,
  ) {}

  async create(routeId: number, createHoldDto: CreateHoldDto, userId?: number): Promise<Hold> {
    const hold = this.holdRepository.create({
      ...createHoldDto,
      route_id: routeId,
    });
    const savedHold = await this.holdRepository.save(hold);
    try {
      await this.routeVersionService.createSnapshot(routeId, {
        userId,
        changeType: RouteVersionChangeType.HOLDS,
        changeDescription: '添加岩点',
      });
    } catch {
      // 版本创建失败不应影响主操作
    }
    return savedHold;
  }

  async batchCreate(routeId: number, createHoldDtos: CreateHoldDto[], userId?: number): Promise<Hold[]> {
    const holds = createHoldDtos.map((dto) =>
      this.holdRepository.create({
        ...dto,
        route_id: routeId,
      }),
    );
    const savedHolds = await this.holdRepository.save(holds);
    try {
      await this.routeVersionService.createSnapshot(routeId, {
        userId,
        changeType: RouteVersionChangeType.HOLDS,
        changeDescription: `批量添加 ${savedHolds.length} 个岩点`,
      });
    } catch {
      // 版本创建失败不应影响主操作
    }
    return savedHolds;
  }

  async batchImportFromCsv(
    routeId: number,
    csvContent: string,
    headerMap?: CsvHeaderMap,
    userId?: number,
  ): Promise<BatchImportResult> {
    const route = await this.routeRepository.findOne({ where: { id: routeId } });
    if (!route) {
      throw new NotFoundException('Route with id ' + routeId + ' not found');
    }

    const wall = await this.wallRepository.findOne({ where: { id: route.wall_id } });
    if (!wall) {
      throw new NotFoundException('Wall with id ' + route.wall_id + ' not found');
    }

    const polygon = parsePolygonCoords(wall.polygon_coords);
    const polygonBounds = polygon ? getPolygonBounds(polygon) : null;

    const effectiveHeaderMap = headerMap || DEFAULT_HEADER_MAP;

    const parsedRows = parseCsv(csvContent, effectiveHeaderMap);

    if (parsedRows.length === 0) {
      throw new BadRequestException('CSV 文件为空或格式无效');
    }

    const existingHolds = await this.holdRepository.find({
      where: { route_id: routeId },
    });

    const { validRows, failures } = this.validateRows(
      parsedRows,
      polygon,
      polygonBounds,
      existingHolds,
    );

    const result: BatchImportResult = {
      success: failures.length === 0,
      totalRows: parsedRows.length,
      successCount: 0,
      failureCount: failures.length,
      successHolds: [],
      failures,
    };

    if (failures.length > 0) {
      return result;
    }

    if (validRows.length === 0) {
      return result;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const holdEntities = validRows.map((row) =>
        queryRunner.manager.create(Hold, {
          route_id: routeId,
          position_x: row.position_x,
          position_y: row.position_y,
          type: row.type,
        }),
      );

      const savedHolds = await queryRunner.manager.save(holdEntities);

      await queryRunner.commitTransaction();

      result.success = true;
      result.successCount = savedHolds.length;
      result.successHolds = savedHolds.map((h) => ({
        id: h.id,
        position_x: h.position_x,
        position_y: h.position_y,
        type: h.type,
      }));

      try {
        await this.routeVersionService.createSnapshot(routeId, {
          userId,
          changeType: RouteVersionChangeType.HOLDS,
          changeDescription: `CSV 导入 ${savedHolds.length} 个岩点`,
        });
      } catch {
        // 版本创建失败不应影响主操作
      }
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      result.success = false;
      result.failures.push({
        lineNumber: 0,
        reason: '数据库错误: ' + (error.message || '未知错误'),
      });
      result.failureCount = result.failures.length;
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  private validateRows(
    rows: ParsedCsvRow[],
    polygon: Point[] | null,
    polygonBounds: PolygonBounds | null,
    existingHolds: Hold[],
  ): { validRows: ValidatedHoldRow[]; failures: ValidationFailure[] } {
    const validRows: ValidatedHoldRow[] = [];
    const failures: ValidationFailure[] = [];
    const seenPoints: { x: number; y: number; line: number }[] = [];

    for (const row of rows) {
      const rowFailures: string[] = [];

      let positionX: number | null = null;
      let positionY: number | null = null;

      if (row.position_x === undefined || row.position_x === '') {
        rowFailures.push('缺少 position_x');
      } else {
        const num = parseFloat(row.position_x);
        if (isNaN(num)) {
          rowFailures.push('position_x 格式无效: "' + row.position_x + '"');
        } else {
          positionX = num;
        }
      }

      if (row.position_y === undefined || row.position_y === '') {
        rowFailures.push('缺少 position_y');
      } else {
        const num = parseFloat(row.position_y);
        if (isNaN(num)) {
          rowFailures.push('position_y 格式无效: "' + row.position_y + '"');
        } else {
          positionY = num;
        }
      }

      if (positionX !== null && positionY !== null && polygonBounds) {
        if (positionX < polygonBounds.minX || positionX > polygonBounds.maxX) {
          rowFailures.push(
            'position_x 超出岩壁范围 [' +
              polygonBounds.minX.toFixed(4) +
              ', ' +
              polygonBounds.maxX.toFixed(4) +
              ']: ' +
              positionX
          );
        }
        if (positionY < polygonBounds.minY || positionY > polygonBounds.maxY) {
          rowFailures.push(
            'position_y 超出岩壁范围 [' +
              polygonBounds.minY.toFixed(4) +
              ', ' +
              polygonBounds.maxY.toFixed(4) +
              ']: ' +
              positionY
          );
        }
      }

      let holdType: HoldType | null = null;
      if (!row.type || row.type.trim() === '') {
        rowFailures.push('缺少 type');
      } else {
        const typeLower = row.type.trim().toLowerCase();
        if (HOLD_TYPE_VALUES.includes(typeLower)) {
          holdType = typeLower as HoldType;
        } else {
          rowFailures.push(
            'type 无效: "' + row.type + '", 有效值: ' + HOLD_TYPE_VALUES.join(', ')
          );
        }
      }

      if (positionX !== null && positionY !== null && polygon) {
        if (!isPointInPolygon({ x: positionX, y: positionY }, polygon)) {
          rowFailures.push('坐标不在岩壁范围内');
        }
      }

      if (positionX !== null && positionY !== null) {
        const csvDuplicate = seenPoints.find(
          (p) =>
            Math.abs(p.x - positionX) < DUPLICATE_EPSILON &&
            Math.abs(p.y - positionY) < DUPLICATE_EPSILON,
        );
        if (csvDuplicate) {
          rowFailures.push('与第 ' + csvDuplicate.line + ' 行坐标重复');
        } else {
          seenPoints.push({ x: positionX, y: positionY, line: row.lineNumber });
        }

        const dbDuplicate = existingHolds.find(
          (h) =>
            Math.abs(h.position_x - positionX) < DUPLICATE_EPSILON &&
            Math.abs(h.position_y - positionY) < DUPLICATE_EPSILON,
        );
        if (dbDuplicate) {
          rowFailures.push('与已有岩点重复 (id: ' + dbDuplicate.id + ')');
        }
      }

      if (rowFailures.length > 0) {
        failures.push({
          lineNumber: row.lineNumber,
          reason: rowFailures.join('; '),
        });
      } else if (positionX !== null && positionY !== null && holdType !== null) {
        validRows.push({
          lineNumber: row.lineNumber,
          position_x: positionX,
          position_y: positionY,
          type: holdType,
        });
      }
    }

    return { validRows, failures };
  }

  findAllByRoute(routeId: number): Promise<Hold[]> {
    return this.holdRepository.find({ where: { route_id: routeId } });
  }

  findOne(id: number): Promise<Hold | null> {
    return this.holdRepository.findOne({ where: { id } });
  }

  async update(id: number, updateHoldDto: UpdateHoldDto, userId?: number): Promise<Hold> {
    const hold = await this.findOne(id);
    if (!hold) {
      throw new NotFoundException('Hold with id ' + id + ' not found');
    }
    Object.assign(hold, updateHoldDto);
    const savedHold = await this.holdRepository.save(hold);
    try {
      await this.routeVersionService.createSnapshot(savedHold.route_id, {
        userId,
        changeType: RouteVersionChangeType.HOLDS,
        changeDescription: '修改岩点',
      });
    } catch {
      // 版本创建失败不应影响主操作
    }
    return savedHold;
  }

  async remove(id: number, userId?: number): Promise<void> {
    const hold = await this.findOne(id);
    if (!hold) {
      throw new NotFoundException('Hold with id ' + id + ' not found');
    }
    const routeId = hold.route_id;
    const result = await this.holdRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Hold with id ' + id + ' not found');
    }
    try {
      await this.routeVersionService.createSnapshot(routeId, {
        userId,
        changeType: RouteVersionChangeType.HOLDS,
        changeDescription: '删除岩点',
      });
    } catch {
      // 版本创建失败不应影响主操作
    }
  }
}
