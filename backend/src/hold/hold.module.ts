import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hold } from '../entities/hold.entity';
import { Route } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { RouteVersion } from '../entities/route-version.entity';
import { User } from '../entities/user.entity';
import { HoldService } from './hold.service';
import { HoldController } from './hold.controller';
import { RouteVersionService } from '../route/route-version.service';

@Module({
  imports: [TypeOrmModule.forFeature([Hold, Route, Wall, RouteVersion, User])],
  controllers: [HoldController],
  providers: [HoldService, RouteVersionService],
  exports: [HoldService],
})
export class HoldModule {}
