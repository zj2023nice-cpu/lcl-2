import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, Like, Brackets } from 'typeorm';
import { Route, RouteType, RouteStatus } from '../entities/route.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall } from '../entities/wall.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { QueryArchivedRoutesDto } from './dto/query-archived-routes.dto';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
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
}
