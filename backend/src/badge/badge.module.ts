import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Badge } from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Ascent } from '../entities/ascent.entity';
import { Comment } from '../entities/comment.entity';
import { Route } from '../entities/route.entity';
import { User } from '../entities/user.entity';
import { BadgeService } from './badge.service';
import { BadgeController } from './badge.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Badge, UserBadge, Ascent, Comment, Route, User]),
  ],
  providers: [BadgeService],
  controllers: [BadgeController],
  exports: [BadgeService],
})
export class BadgeModule {}
