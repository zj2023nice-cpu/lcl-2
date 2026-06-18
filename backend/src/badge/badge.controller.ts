import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { BadgeService } from './badge.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UserBadge } from '../entities/user-badge.entity';

@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  @Get('me')
  async getMyBadges(@CurrentUser() user: User) {
    const result = await this.badgeService.getUserBadges(user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Post('check')
  async checkAndUnlockBadges(@CurrentUser() user: User) {
    try {
      const result = await this.badgeService.checkAndUnlockBadges(user.id);
      return {
        success: true,
        data: {
          newlyUnlocked: result.newlyUnlocked,
          allBadges: result.allBadges,
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to check badges',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  async getMyBadgeStats(@CurrentUser() user: User) {
    const stats = await this.badgeService.getUserStatsForBadges(user.id);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('user/:userId')
  async getUserBadges(@Param('userId') userId: string) {
    const result = await this.badgeService.getUserBadges(parseInt(userId, 10));
    return {
      success: true,
      data: result,
    };
  }

  @Post(':badgeId/notify')
  async markBadgeNotified(
    @CurrentUser() user: User,
    @Param('badgeId') badgeId: string,
  ) {
    const userBadges = await this.badgeService.getUserBadges(user.id);
    const userBadge = userBadges.badges.find(
      (ub) => ub.badge_id === parseInt(badgeId, 10),
    );

    if (!userBadge) {
      throw new HttpException('Badge not found', HttpStatus.NOT_FOUND);
    }

    await this.badgeService.markBadgeNotified(userBadge.id);
    return {
      success: true,
      message: 'Badge marked as notified',
    };
  }

  @Get(':badgeId/poster')
  async getBadgePosterData(
    @CurrentUser() user: User,
    @Param('badgeId') badgeId: string,
  ) {
    try {
      const data = await this.badgeService.generatePosterData(
        user.id,
        parseInt(badgeId, 10),
      );
      return {
        success: true,
        data,
      };
    } catch (error) {
      if (error.message === 'Badge not unlocked') {
        throw new HttpException('Badge not unlocked', HttpStatus.FORBIDDEN);
      }
      throw new HttpException(
        'Failed to generate poster',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('share/:shareId')
  async getSharedBadge(@Param('shareId') shareId: string) {
    const id = parseInt(shareId, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid share ID', HttpStatus.BAD_REQUEST);
    }
    return {
      success: true,
      data: { shareId: id },
    };
  }
}
