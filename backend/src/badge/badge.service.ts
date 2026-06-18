import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Badge,
  BadgeCondition,
  BadgeConditionType,
  BadgeRarity,
} from '../entities/badge.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Ascent, AscentType } from '../entities/ascent.entity';
import { Comment } from '../entities/comment.entity';
import { Route } from '../entities/route.entity';
import { User } from '../entities/user.entity';
import { BADGE_DEFINITIONS } from './badge.data';

export interface UserStats {
  totalAscents: number;
  maxGrade: number;
  flashCount: number;
  onsightCount: number;
  checkinStreak: number;
  totalComments: number;
  totalLikes: number;
  routesSet: number;
  gymVisits: number;
  monthsActive: number;
}

@Injectable()
export class BadgeService implements OnModuleInit {
  private readonly logger = new Logger(BadgeService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Ascent)
    private readonly ascentRepository: Repository<Ascent>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.initBadges();
  }

  async initBadges() {
    try {
      const existingBadges = await this.badgeRepository.find();
      const existingCodes = new Set(existingBadges.map((b) => b.code));

      for (const badgeDef of BADGE_DEFINITIONS) {
        if (!existingCodes.has(badgeDef.code)) {
          const badge = this.badgeRepository.create(badgeDef);
          await this.badgeRepository.save(badge);
          this.logger.log(`Created badge: ${badgeDef.code}`);
        } else {
          const existing = existingBadges.find((b) => b.code === badgeDef.code);
          if (existing) {
            existing.name = badgeDef.name;
            existing.description = badgeDef.description;
            existing.rarity = badgeDef.rarity;
            existing.category = badgeDef.category;
            existing.conditions = badgeDef.conditions;
            existing.icon = badgeDef.icon;
            existing.color = badgeDef.color;
            existing.points = badgeDef.points;
            existing.is_active = badgeDef.is_active;
            await this.badgeRepository.save(existing);
          }
        }
      }
      this.logger.log('Badge initialization completed');
    } catch (error) {
      this.logger.error('Failed to initialize badges', error);
    }
  }

  private parseGrade(grade: string): number {
    if (!grade) return -1;
    const match = grade.match(/V(\d+)/i);
    return match ? parseInt(match[1], 10) : -1;
  }

  private async calculateCheckinStreak(userId: number): Promise<number> {
    const ascents = await this.ascentRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      select: ['created_at'],
    });

    if (ascents.length === 0) return 0;

    const dates = new Set<string>();
    ascents.forEach((a) => {
      const date = a.created_at.toISOString().split('T')[0];
      dates.add(date);
    });

    const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (sortedDates.includes(checkDateStr)) {
        streak++;
      } else if (i === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (sortedDates[0] === yesterdayStr) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  async calculateUserStats(userId: number): Promise<UserStats> {
    const [ascents, comments, routesSet, user] = await Promise.all([
      this.ascentRepository.find({
        where: { user_id: userId },
        relations: ['route'],
      }),
      this.commentRepository.find({
        where: { user_id: userId },
      }),
      this.routeRepository.find({
        where: { setter_id: userId },
      }),
      this.userRepository.findOne({ where: { id: userId } }),
    ]);

    const completedAscents = ascents.filter(
      (a) =>
        a.ascent_type === AscentType.FLASH ||
        a.ascent_type === AscentType.REDPOINT ||
        a.ascent_type === AscentType.ONSIGHT,
    );

    const grades = completedAscents
      .map((a) => this.parseGrade(a.route?.grade || a.felt_grade || ''))
      .filter((g) => g >= 0);
    const maxGrade = grades.length > 0 ? Math.max(...grades) : 0;

    const flashCount = completedAscents.filter(
      (a) => a.ascent_type === AscentType.FLASH,
    ).length;
    const onsightCount = completedAscents.filter(
      (a) => a.ascent_type === AscentType.ONSIGHT,
    ).length;

    const totalLikes = comments.reduce((sum, c) => sum + (c.like_count || 0), 0);

    const gymVisits = new Set(
      completedAscents.map((a) => a.created_at.toISOString().split('T')[0]),
    ).size;

    const checkinStreak = await this.calculateCheckinStreak(userId);

    const startDate = completedAscents.length > 0
      ? new Date(completedAscents[completedAscents.length - 1].created_at)
      : new Date(user?.created_at || Date.now());
    const now = new Date();
    const monthsActive = Math.max(
      1,
      (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()),
    );

    return {
      totalAscents: completedAscents.length,
      maxGrade,
      flashCount,
      onsightCount,
      checkinStreak,
      totalComments: comments.length,
      totalLikes,
      routesSet: routesSet.length,
      gymVisits,
      monthsActive,
    };
  }

  private evaluateCondition(
    condition: BadgeCondition,
    stats: UserStats,
  ): number {
    const { type, value } = condition;
    let current = 0;

    switch (type) {
      case BadgeConditionType.TOTAL_ASCENTS:
        current = stats.totalAscents;
        break;
      case BadgeConditionType.MAX_GRADE:
        current = stats.maxGrade;
        break;
      case BadgeConditionType.CHECKIN_STREAK:
        current = stats.checkinStreak;
        break;
      case BadgeConditionType.FLASH_COUNT:
        current = stats.flashCount;
        break;
      case BadgeConditionType.ONSIGHT_COUNT:
        current = stats.onsightCount;
        break;
      case BadgeConditionType.TOTAL_COMMENTS:
        current = stats.totalComments;
        break;
      case BadgeConditionType.TOTAL_LIKES:
        current = stats.totalLikes;
        break;
      case BadgeConditionType.ROUTES_SET:
        current = stats.routesSet;
        break;
      case BadgeConditionType.GYM_VISITS:
        current = stats.gymVisits;
        break;
      case BadgeConditionType.MONTHS_ACTIVE:
        current = stats.monthsActive;
        break;
      default:
        current = 0;
    }

    return value > 0 ? Math.min(100, (current / value) * 100) : 100;
  }

  private checkConditionMet(
    condition: BadgeCondition,
    stats: UserStats,
  ): boolean {
    const progress = this.evaluateCondition(condition, stats);
    return progress >= 100;
  }

  async checkAndUnlockBadges(userId: number): Promise<{
    newlyUnlocked: UserBadge[];
    allBadges: UserBadge[];
  }> {
    const stats = await this.calculateUserStats(userId);
    const activeBadges = await this.badgeRepository.find({
      where: { is_active: true },
    });

    const existingUserBadges = await this.userBadgeRepository.find({
      where: { user_id: userId },
      relations: ['badge'],
    });

    const existingBadgeIds = new Set(existingUserBadges.map((ub) => ub.badge_id));
    const newlyUnlocked: UserBadge[] = [];

    for (const badge of activeBadges) {
      let userBadge = existingUserBadges.find((ub) => ub.badge_id === badge.id);

      const allConditionsMet = badge.conditions.every((condition) =>
        this.checkConditionMet(condition, stats),
      );

      const progressDetails: Record<string, number> = {};
      let totalProgress = 0;
      badge.conditions.forEach((condition) => {
        const progress = this.evaluateCondition(condition, stats);
        progressDetails[condition.type] = progress;
        totalProgress += progress;
      });
      const averageProgress = totalProgress / badge.conditions.length;

      if (!userBadge) {
        userBadge = this.userBadgeRepository.create({
          user_id: userId,
          badge_id: badge.id,
          progress: averageProgress,
          unlocked: allConditionsMet,
          unlocked_at: allConditionsMet ? new Date() : null,
          notified: false,
          progress_details: progressDetails,
        });

        if (allConditionsMet) {
          newlyUnlocked.push(userBadge);
        }
      } else {
        const wasUnlocked = userBadge.unlocked;
        userBadge.progress = averageProgress;
        userBadge.progress_details = progressDetails;

        if (!wasUnlocked && allConditionsMet) {
          userBadge.unlocked = true;
          userBadge.unlocked_at = new Date();
          userBadge.notified = false;
          newlyUnlocked.push(userBadge);
        }
      }

      existingBadgeIds.add(badge.id);
      await this.userBadgeRepository.save(userBadge);
    }

    const allBadges = await this.userBadgeRepository.find({
      where: { user_id: userId },
      relations: ['badge'],
      order: { unlocked: 'DESC', created_at: 'DESC' },
    });

    return { newlyUnlocked, allBadges };
  }

  async getUserBadges(userId: number): Promise<{
    badges: UserBadge[];
    stats: {
      total: number;
      unlocked: number;
      common: { total: number; unlocked: number };
      rare: { total: number; unlocked: number };
      legendary: { total: number; unlocked: number };
      totalPoints: number;
    };
  }> {
    const [userBadges, allActiveBadges] = await Promise.all([
      this.userBadgeRepository.find({
        where: { user_id: userId },
        relations: ['badge'],
        order: { badge: { rarity: 'ASC', points: 'ASC' } },
      }),
      this.badgeRepository.find({ where: { is_active: true } }),
    ]);

    const userBadgeMap = new Map(userBadges.map((ub) => [ub.badge_id, ub]));
    const allBadges: UserBadge[] = allActiveBadges.map((badge) => {
      const existing = userBadgeMap.get(badge.id);
      if (existing) return existing;
      return this.userBadgeRepository.create({
        user_id: userId,
        badge_id: badge.id,
        progress: 0,
        unlocked: false,
        unlocked_at: null,
        notified: false,
        progress_details: {},
        badge,
      });
    });

    const unlockedBadges = allBadges.filter((ub) => ub.unlocked);
    const totalPoints = unlockedBadges.reduce(
      (sum, ub) => sum + (ub.badge?.points || 0),
      0,
    );

    const countByRarity = (rarity: BadgeRarity) => ({
      total: allBadges.filter((ub) => ub.badge?.rarity === rarity).length,
      unlocked: unlockedBadges.filter((ub) => ub.badge?.rarity === rarity).length,
    });

    return {
      badges: allBadges.sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        const rarityOrder = {
          [BadgeRarity.LEGENDARY]: 0,
          [BadgeRarity.RARE]: 1,
          [BadgeRarity.COMMON]: 2,
        };
        return (
          rarityOrder[a.badge?.rarity || BadgeRarity.COMMON] -
          rarityOrder[b.badge?.rarity || BadgeRarity.COMMON]
        );
      }),
      stats: {
        total: allBadges.length,
        unlocked: unlockedBadges.length,
        common: countByRarity(BadgeRarity.COMMON),
        rare: countByRarity(BadgeRarity.RARE),
        legendary: countByRarity(BadgeRarity.LEGENDARY),
        totalPoints,
      },
    };
  }

  async markBadgeNotified(userBadgeId: number): Promise<void> {
    await this.userBadgeRepository.update(userBadgeId, { notified: true });
  }

  async generatePosterData(userId: number, badgeId: number): Promise<{
    badge: Badge;
    user: { name: string; totalPoints: number; unlockedCount: number };
    unlockedAt: Date | null;
    qrContent: string;
  }> {
    const [userBadge, user] = await Promise.all([
      this.userBadgeRepository.findOne({
        where: { user_id: userId, badge_id: badgeId },
        relations: ['badge'],
      }),
      this.userRepository.findOne({ where: { id: userId } }),
    ]);

    if (!userBadge || !userBadge.unlocked || !user) {
      throw new Error('Badge not unlocked or user not found');
    }

    const { stats } = await this.getUserBadges(userId);

    const qrContent = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/badge/share/${userBadge.id}`;

    return {
      badge: userBadge.badge,
      user: {
        name: user.name,
        totalPoints: stats.totalPoints,
        unlockedCount: stats.unlocked,
      },
      unlockedAt: userBadge.unlocked_at,
      qrContent,
    };
  }

  async getUserStatsForBadges(userId: number): Promise<UserStats> {
    return this.calculateUserStats(userId);
  }

  async getSharedBadgeData(
    userBadgeId: number,
  ): Promise<{
    badge: Badge;
    user: {
      id: number;
      name: string;
      totalPoints: number;
      unlockedCount: number;
    };
    unlockedAt: Date | null;
    progress: number;
  }> {
    const userBadge = await this.userBadgeRepository.findOne({
      where: { id: userBadgeId, unlocked: true },
      relations: ['badge', 'user'],
    });

    if (!userBadge) {
      throw new Error('Shared badge not found or not unlocked');
    }

    const { stats } = await this.getUserBadges(userBadge.user_id);

    return {
      badge: userBadge.badge,
      user: {
        id: userBadge.user.id,
        name: userBadge.user.name,
        totalPoints: stats.totalPoints,
        unlockedCount: stats.unlocked,
      },
      unlockedAt: userBadge.unlocked_at,
      progress: userBadge.progress,
    };
  }
}
