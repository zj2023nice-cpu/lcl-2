import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { Hold } from '../entities/hold.entity';
import { User } from '../entities/user.entity';
import { Gym } from '../entities/gym.entity';
import { OperationLog } from '../entities/operation-log.entity';
import { RouteVersion } from '../entities/route-version.entity';
import { RouteService } from './route.service';
import { RouteVersionService } from './route-version.service';
import { RouteController } from './route.controller';
import { RouteShareService } from './route-share.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route, Wall, Hold, User, Gym, OperationLog, RouteVersion])],
  controllers: [RouteController],
  providers: [RouteService, RouteVersionService, RouteShareService],
  exports: [RouteService, RouteVersionService],
})
export class RouteModule {}
