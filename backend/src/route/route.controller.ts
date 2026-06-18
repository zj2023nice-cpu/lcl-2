import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { UpdateRouteStatusDto } from './dto/update-route-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { RouteType, RouteStatus } from '../entities/route.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get('walls/:wallId/routes')
  findAllByWall(
    @Param('wallId', ParseIntPipe) wallId: number,
    @Query('type') type?: RouteType,
    @Query('grade') grade?: string,
    @Query('status') status?: RouteStatus,
  ) {
    return this.routeService.findAllByWall(wallId, { type, grade, status });
  }

  @Get('routes/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.routeService.findOne(id);
  }

  @Get('routes/:id/can-edit')
  async canEdit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    const canEdit = await this.routeService.canEditRoute(id, user);
    return { canEdit };
  }

  @Post('walls/:wallId/routes')
  @Roles(UserRole.SETTER)
  create(
    @Param('wallId', ParseIntPipe) wallId: number,
    @Body() createRouteDto: CreateRouteDto,
  ) {
    return this.routeService.create(wallId, createRouteDto);
  }

  @Put('routes/:id')
  @Roles(UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    await this.routeService.checkCanEditRoute(id, user);
    return this.routeService.update(id, updateRouteDto);
  }

  @Delete('routes/:id')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    await this.routeService.checkCanEditRoute(id, user);
    return this.routeService.remove(id);
  }

  @Patch('routes/:id/status')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER, UserRole.PLATFORM_ADMIN)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteStatusDto: UpdateRouteStatusDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    await this.routeService.checkCanEditRoute(id, user);
    return this.routeService.updateStatus(id, updateRouteStatusDto.status);
  }
}
