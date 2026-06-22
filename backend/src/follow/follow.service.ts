import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, MoreThan } from 'typeorm';
import { UserFollow } from '../entities/user-follow.entity';
import { User, UserRole } from '../entities/user.entity';
import { Ascent, AscentVisibility } from '../entities/ascent.entity';
import { QueryFollowDto } from './dto/query-follow.dto';
import { QueryFeedDto } from './dto/query-feed.dto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class FollowService {
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly FOLLOW_RATE_LIMIT = 50;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000;
  private readonly MAX_FOLLOWING_PER_USER = 5000;

  private followCountCache: Map<number, CacheEntry<number>> = new Map();
  private followerCountCache: Map<number, CacheEntry<number>> = new Map();
  private followRateLimits: Map<number, RateLimitEntry> = new Map();

  constructor(
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Ascent)
    private ascentRepository: Repository<Ascent>,
  ) {}

  private checkRateLimit(userId: number): void {
    const now = Date.now();
    const entry = this.followRateLimits.get(userId);

    if (!entry || now - entry.windowStart >= this.RATE_LIMIT_WINDOW) {
      this.followRateLimits.set(userId, {
        count: 1,
        windowStart: now,
      });
      return;
    }

    if (entry.count >= this.FOLLOW_RATE_LIMIT) {
      throw new BadRequestException(
        '操作过于频繁，请稍后再试',
      );
    }

    entry.count += 1;
  }

  private getCachedCount(
    cache: Map<number, CacheEntry<number>>,
    userId: number,
  ): number | null {
    const entry = cache.get(userId);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value;
    }
    return null;
  }

  private setCachedCount(
    cache: Map<number, CacheEntry<number>>,
    userId: number,
    value: number,
  ): void {
    cache.set(userId, {
      value,
      expiresAt: Date.now() + this.CACHE_TTL,
    });
  }

  private invalidateCountCaches(userId: number): void {
    this.followCountCache.delete(userId);
    this.followerCountCache.delete(userId);
  }

  async follow(followerId: number, followingId: number): Promise<UserFollow> {
    if (followerId === followingId) {
      throw new BadRequestException('不能关注自己');
    }

    this.checkRateLimit(followerId);

    const followingUser = await this.userRepository.findOne({
      where: { id: followingId },
    });
    if (!followingUser) {
      throw new NotFoundException('用户不存在');
    }

    const existingFollow = await this.followRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    if (existingFollow) {
      throw new ConflictException('已经关注该用户');
    }

    const followingCount = await this.getFollowingCount(followerId);
    if (followingCount >= this.MAX_FOLLOWING_PER_USER) {
      throw new BadRequestException(
        `关注数量已达上限(${this.MAX_FOLLOWING_PER_USER})`,
      );
    }

    const follow = this.followRepository.create({
      follower_id: followerId,
      following_id: followingId,
    });

    const savedFollow = await this.followRepository.save(follow);

    this.invalidateCountCaches(followerId);
    this.invalidateCountCaches(followingId);

    return savedFollow;
  }

  async unfollow(followerId: number, followingId: number): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('不能取消关注自己');
    }

    this.checkRateLimit(followerId);

    const follow = await this.followRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    if (!follow) {
      throw new NotFoundException('未关注该用户');
    }

    await this.followRepository.delete(follow.id);

    this.invalidateCountCaches(followerId);
    this.invalidateCountCaches(followingId);
  }

  async isFollowing(
    followerId: number,
    followingId: number,
  ): Promise<{
    isFollowing: boolean;
    isMutual: boolean;
  }> {
    const following = await this.followRepository.findOne({
      where: {
        follower_id: followerId,
        following_id: followingId,
      },
    });

    const followedBy = await this.followRepository.findOne({
      where: {
        follower_id: followingId,
        following_id: followerId,
      },
    });

    return {
      isFollowing: !!following,
      isMutual: !!following && !!followedBy,
    };
  }

  async checkFollowStatus(
    currentUserId: number | null,
    targetUserId: number,
  ): Promise<{
    isFollowing: boolean;
    isMutual: boolean;
    followingCount: number;
    followerCount: number;
  }> {
    const [followingCount, followerCount, followStatus] = await Promise.all([
      this.getFollowingCount(targetUserId),
      this.getFollowerCount(targetUserId),
      currentUserId
        ? this.isFollowing(currentUserId, targetUserId)
        : { isFollowing: false, isMutual: false },
    ]);

    return {
      ...followStatus,
      followingCount,
      followerCount,
    };
  }

  async getFollowingCount(userId: number): Promise<number> {
    const cached = this.getCachedCount(this.followCountCache, userId);
    if (cached !== null) return cached;

    const count = await this.followRepository.count({
      where: { follower_id: userId },
    });

    this.setCachedCount(this.followCountCache, userId, count);
    return count;
  }

  async getFollowerCount(userId: number): Promise<number> {
    const cached = this.getCachedCount(this.followerCountCache, userId);
    if (cached !== null) return cached;

    const count = await this.followRepository.count({
      where: { following_id: userId },
    });

    this.setCachedCount(this.followerCountCache, userId, count);
    return count;
  }

  async getFollowingList(
    userId: number,
    queryDto: QueryFollowDto,
    currentUserId: number | null,
  ): Promise<{
    data: Array<{
      id: number;
      name: string;
      role: UserRole;
      verifiedAt: Date | null;
      createdAt: Date;
      isFollowing: boolean;
      isMutual: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { follower_id: userId };

    if (search) {
      where.following = { name: Like(`%${search}%`) };
    }

    const [follows, total] = await this.followRepository.findAndCount({
      where,
      relations: ['following'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const userIds = follows.map((f) => f.following_id);

    let mutualSet: Set<number> = new Set();
    let followingSet: Set<number> = new Set();

    if (currentUserId && userIds.length > 0) {
      const [mutualFollows, currentFollows] = await Promise.all([
        this.followRepository.find({
          where: {
            follower_id: In(userIds),
            following_id: currentUserId,
          },
        }),
        this.followRepository.find({
          where: {
            follower_id: currentUserId,
            following_id: In(userIds),
          },
        }),
      ]);

      mutualSet = new Set(mutualFollows.map((f) => f.follower_id));
      followingSet = new Set(currentFollows.map((f) => f.following_id));
    }

    const data = follows.map((follow) => ({
      id: follow.following.id,
      name: follow.following.name,
      role: follow.following.role,
      verifiedAt: follow.following.verified_at,
      createdAt: follow.created_at,
      isFollowing: followingSet.has(follow.following_id),
      isMutual:
        followingSet.has(follow.following_id) &&
        mutualSet.has(follow.following_id),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFollowerList(
    userId: number,
    queryDto: QueryFollowDto,
    currentUserId: number | null,
  ): Promise<{
    data: Array<{
      id: number;
      name: string;
      role: UserRole;
      verifiedAt: Date | null;
      createdAt: Date;
      isFollowing: boolean;
      isMutual: boolean;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, search } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { following_id: userId };

    if (search) {
      where.follower = { name: Like(`%${search}%`) };
    }

    const [follows, total] = await this.followRepository.findAndCount({
      where,
      relations: ['follower'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const userIds = follows.map((f) => f.follower_id);

    let mutualSet: Set<number> = new Set();
    let followingSet: Set<number> = new Set();

    if (currentUserId && userIds.length > 0) {
      const [currentFollows, followedBy] = await Promise.all([
        this.followRepository.find({
          where: {
            follower_id: currentUserId,
            following_id: In(userIds),
          },
        }),
        this.followRepository.find({
          where: {
            follower_id: In(userIds),
            following_id: currentUserId,
          },
        }),
      ]);

      followingSet = new Set(currentFollows.map((f) => f.following_id));
      mutualSet = new Set(followedBy.map((f) => f.follower_id));
    }

    const data = follows.map((follow) => ({
      id: follow.follower.id,
      name: follow.follower.name,
      role: follow.follower.role,
      verifiedAt: follow.follower.verified_at,
      createdAt: follow.created_at,
      isFollowing: followingSet.has(follow.follower_id),
      isMutual:
        followingSet.has(follow.follower_id) &&
        mutualSet.has(follow.follower_id),
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFollowingUserIds(userId: number): Promise<number[]> {
    const follows = await this.followRepository.find({
      where: { follower_id: userId },
      select: ['following_id'],
    });
    return follows.map((f) => f.following_id);
  }

  async getFeed(
    userId: number,
    queryDto: QueryFeedDto,
  ): Promise<{
    data: Array<{
      date: string;
      ascents: Array<{
        id: number;
        userId: number;
        userName: string;
        routeId: number;
        routeName: string;
        routeGrade: string;
        routeColor: string | null;
        ascentType: string;
        attempts: number;
        notes: string | null;
        createdAt: Date;
      }>;
    }>;
    hasMore: boolean;
    total: number;
  }> {
    const { page = 1, limit = 20 } = queryDto;
    const skip = (page - 1) * limit;

    const followingIds = await this.getFollowingUserIds(userId);
    followingIds.push(userId);

    if (followingIds.length === 0) {
      return { data: [], hasMore: false, total: 0 };
    }

    const [ascents, total] = await this.ascentRepository.findAndCount({
      where: {
        user_id: In(followingIds),
        visibility: In([AscentVisibility.PUBLIC, AscentVisibility.FRIENDS]),
      },
      relations: ['route', 'user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const dateGroups: Map<
      string,
      Array<{
        id: number;
        userId: number;
        userName: string;
        routeId: number;
        routeName: string;
        routeGrade: string;
        routeColor: string | null;
        ascentType: string;
        attempts: number;
        notes: string | null;
        createdAt: Date;
      }>
    > = new Map();

    for (const ascent of ascents) {
      const dateStr = ascent.created_at.toISOString().split('T')[0];

      if (!dateGroups.has(dateStr)) {
        dateGroups.set(dateStr, []);
      }

      dateGroups.get(dateStr)!.push({
        id: ascent.id,
        userId: ascent.user_id,
        userName: ascent.user?.name || '未知用户',
        routeId: ascent.route_id,
        routeName: ascent.route?.name || '未知线路',
        routeGrade: ascent.route?.grade || '-',
        routeColor: (ascent.route as any)?.color || null,
        ascentType: ascent.ascent_type,
        attempts: ascent.attempts,
        notes: ascent.notes,
        createdAt: ascent.created_at,
      });
    }

    const data = Array.from(dateGroups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, ascentsList]) => ({
        date,
        ascents: ascentsList,
      }));

    const hasMore = skip + limit < total;

    return {
      data,
      hasMore,
      total,
    };
  }
}
