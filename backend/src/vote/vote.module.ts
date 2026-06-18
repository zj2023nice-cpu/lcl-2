import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradeVote } from '../entities/grade-vote.entity';
import { Route } from '../entities/route.entity';
import { User } from '../entities/user.entity';
import { Ascent } from '../entities/ascent.entity';
import { VoteService } from './vote.service';
import { VoteController } from './vote.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GradeVote, Route, User, Ascent])],
  controllers: [VoteController],
  providers: [VoteService],
  exports: [VoteService],
})
export class VoteModule {}
