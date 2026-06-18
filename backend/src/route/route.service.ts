import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Route, RouteType, RouteStatus } from '../entities/route.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall } from '../entities/wall.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

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
    },
  ): Promise<Route[]> {
    const options: FindManyOptions<Route> = {
      where: { wall_id: wallId },
    };

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
}
