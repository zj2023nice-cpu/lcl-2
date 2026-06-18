import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hold } from '../entities/hold.entity';
import { Route } from '../entities/route.entity';
import { Wall } from '../entities/wall.entity';
import { HoldService } from './hold.service';
import { HoldController } from './hold.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Hold, Route, Wall])],
  controllers: [HoldController],
  providers: [HoldService],
  exports: [HoldService],
})
export class HoldModule {}
