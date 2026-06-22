import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gym } from '../entities/gym.entity';
import { GymBusinessHours } from '../entities/gym-business-hours.entity';
import { GymService } from './gym.service';
import { BusinessHoursService } from './business-hours.service';
import { GymController } from './gym.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Gym, GymBusinessHours])],
  controllers: [GymController],
  providers: [GymService, BusinessHoursService],
  exports: [GymService, BusinessHoursService],
})
export class GymModule {}
