import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { UserFollow } from '../entities/user-follow.entity';
import { User } from '../entities/user.entity';
import { Ascent } from '../entities/ascent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserFollow, User, Ascent]),
  ],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
