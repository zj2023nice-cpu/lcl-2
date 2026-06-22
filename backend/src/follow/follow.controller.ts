import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowUserDto } from './dto/follow-user.dto';
import { QueryFollowDto } from './dto/query-follow.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post('follow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  follow(
    @Body() followDto: FollowUserDto,
    @Request() req: any,
  ) {
    return this.followService.follow(req.user.id, followDto.followingId);
  }

  @Delete('follow/:followingId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  unfollow(
    @Param('followingId', ParseIntPipe) followingId: number,
    @Request() req: any,
  ) {
    return this.followService.unfollow(req.user.id, followingId);
  }

  @Get('follow/status/:targetUserId')
  @UseGuards(OptionalJwtAuthGuard)
  getFollowStatus(
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
    @Request() req: any,
  ) {
    return this.followService.checkFollowStatus(
      req.user?.id || null,
      targetUserId,
    );
  }

  @Get('users/:userId/following')
  @UseGuards(OptionalJwtAuthGuard)
  getFollowingList(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() queryDto: QueryFollowDto,
    @Request() req: any,
  ) {
    return this.followService.getFollowingList(
      userId,
      queryDto,
      req.user?.id || null,
    );
  }

  @Get('users/:userId/followers')
  @UseGuards(OptionalJwtAuthGuard)
  getFollowerList(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() queryDto: QueryFollowDto,
    @Request() req: any,
  ) {
    return this.followService.getFollowerList(
      userId,
      queryDto,
      req.user?.id || null,
    );
  }

  @Get('follow/:followerId/:followingId')
  @UseGuards(JwtAuthGuard)
  checkIsFollowing(
    @Param('followerId', ParseIntPipe) followerId: number,
    @Param('followingId', ParseIntPipe) followingId: number,
  ) {
    return this.followService.isFollowing(followerId, followingId);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VERIFIED_CLIMBER, UserRole.SETTER, UserRole.GYM_ADMIN, UserRole.PLATFORM_ADMIN)
  getFeed(
    @Query() queryDto: QueryFeedDto,
    @Request() req: any,
  ) {
    return this.followService.getFeed(req.user.id, queryDto);
  }

  @Get('users/:userId/following-count')
  getFollowingCount(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.followService.getFollowingCount(userId);
  }

  @Get('users/:userId/follower-count')
  getFollowerCount(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.followService.getFollowerCount(userId);
  }
}
