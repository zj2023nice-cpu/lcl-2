import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { Hold } from '../entities/hold.entity';
import { User } from '../entities/user.entity';
import { Gym } from '../entities/gym.entity';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { RouteShareService } from './route-share.service';

@Module({
  imports: [TypeOrmModule.forFeature([Route, Wall, Hold, User, Gym])],
  controllers: [RouteController],
  providers: [RouteService, RouteShareService],
  exports: [RouteService],
})
export class RouteModule {}
