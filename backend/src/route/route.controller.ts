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
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RouteService } from './route.service';
import { RouteShareService } from './route-share.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { UpdateRouteStatusDto } from './dto/update-route-status.dto';
import { BatchUpdateRouteStatusDto } from './dto/batch-update-route-status.dto';
import { ArchiveRouteDto } from './dto/archive-route.dto';
import { QueryArchivedRoutesDto } from './dto/query-archived-routes.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../entities/user.entity';
import { RouteType, RouteStatus } from '../entities/route.entity';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RouteController {
  constructor(
    private readonly routeService: RouteService,
    private readonly routeShareService: RouteShareService,
  ) {}

  @Get('walls/:wallId/routes')
  findAllByWall(
    @Param('wallId', ParseIntPipe) wallId: number,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
    @Query('type') type?: RouteType,
    @Query('grade') grade?: string,
    @Query('status') status?: RouteStatus,
    @Query('includeArchived') includeArchived?: boolean,
  ) {
    const canIncludeArchived = includeArchived &&
      (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.GYM_ADMIN);
    return this.routeService.findAllByWall(wallId, {
      type,
      grade,
      status,
      includeArchived: canIncludeArchived,
    });
  }

  @Post('routes/batch/status/preview')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER, UserRole.PLATFORM_ADMIN)
  async batchStatusPreview(
    @Body() dto: BatchUpdateRouteStatusDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    return this.routeService.previewBatchStatus(dto, user);
  }

  @Patch('routes/batch/status')
  @Roles(UserRole.GYM_ADMIN, UserRole.SETTER, UserRole.PLATFORM_ADMIN)
  async batchUpdateStatus(
    @Body() dto: BatchUpdateRouteStatusDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
    @Req() req: Request,
  ) {
    return this.routeService.batchUpdateStatus(dto, user, req.ip);
  }

  @Get('routes/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    const route = await this.routeService.findOneForUser(id, user);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }
    return route;
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

  @Get('routes/:id/share-image')
  async getShareImage(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    const route = await this.routeService.findOneForUser(id, user);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const result = await this.routeShareService.generateShareImage(id, baseUrl);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.imageBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(result.imageBuffer);
  }

  @Get('routes/:id/share-metadata')
  async getShareMetadata(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    const route = await this.routeService.findOneForUser(id, user);
    if (!route) {
      throw new NotFoundException(`Route with id ${id} not found`);
    }

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    return this.routeShareService.getShareMetadata(id, baseUrl);
  }

  @Patch('routes/:id/archive')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveRouteDto: ArchiveRouteDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    await this.routeService.checkCanEditRoute(id, user);
    return this.routeService.archive(id, archiveRouteDto.reason, user.id);
  }

  @Patch('routes/:id/restore')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    await this.routeService.checkCanEditRoute(id, user);
    return this.routeService.restore(id, user.id);
  }

  @Get('archived-routes')
  @Roles(UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  async findArchived(
    @Query() query: QueryArchivedRoutesDto,
    @CurrentUser() user: { id: number; role: UserRole; gym_id?: number },
  ) {
    return this.routeService.findArchived(query, user);
  }
}
