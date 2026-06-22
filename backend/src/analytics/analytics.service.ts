import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, MoreThan } from 'typeorm';
import { Route, RouteStatus } from '../entities/route.entity';
import { Ascent, AscentType } from '../entities/ascent.entity';
import { User, UserRole } from '../entities/user.entity';
import { Wall, WallAngle } from '../entities/wall.entity';
import { Hold, HoldType } from '../entities/hold.entity';

export interface RouteHeat {
  route_id: number;
  route_name: string;
  grade: string;
  total_ascents: number;
  sent_count: number;
  send_rate: number;
}

export interface ColdRoute {
  route_id: number;
  route_name: string;
  grade: string;
  days_since_last_ascent: number;
  open_date: Date | null;
}

export interface SetterWorkload {
  setter_id: number;
  setter_name: string;
  routes_set: number;
}

export interface CompletionGroupItem {
  route_id: number;
  route_name: string;
  grade: string;
  wall_angle: string | null;
  wall_name: string;
  attempt_count: number;
  success_count: number;
  fall_count: number;
  completion_rate: number;
  fall_positions: { x: number; y: number; intensity: number }[];
}

export interface CompletionGroup {
  key: string;
  label: string;
  attempt_count: number;
  success_count: number;
  fall_count: number;
  completion_rate: number;
  routes: CompletionGroupItem[];
}

export interface CompletionTrend {
  period: string;
  attempt_count: number;
  success_count: number;
  fall_count: number;
  completion_rate: number;
}

export interface RouteCompletionAnalysis {
  groups: CompletionGroup[];
  trend: CompletionTrend[];
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Ascent)
    private ascentRepository: Repository<Ascent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wall)
    private wallRepository: Repository<Wall>,
    @InjectRepository(Hold)
    private holdRepository: Repository<Hold>,
  ) {}

  async getRouteHeat(gymId: number): Promise<RouteHeat[]> {
    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const routes = await this.routeRepository.find({
      where: { wall_id: In(wallIds), status: RouteStatus.OPEN },
      select: ['id', 'name', 'grade'],
    });

    const result: RouteHeat[] = [];
    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    for (const route of routes) {
      const allAscents = await this.ascentRepository.count({
        where: { route_id: route.id },
      });

      const sentAscents = await this.ascentRepository
        .createQueryBuilder('ascent')
        .where('ascent.route_id = :routeId', { routeId: route.id })
        .andWhere('ascent.ascent_type IN (:...types)', { types: sentTypes })
        .getCount();

      result.push({
        route_id: route.id,
        route_name: route.name,
        grade: route.grade,
        total_ascents: allAscents,
        sent_count: sentAscents,
        send_rate: allAscents > 0 ? Number(((sentAscents / allAscents) * 100).toFixed(2)) : 0,
      });
    }

    return result.sort((a, b) => b.total_ascents - a.total_ascents);
  }

  async getColdRoutes(gymId: number): Promise<ColdRoute[]> {
    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const routes = await this.routeRepository.find({
      where: { wall_id: In(wallIds), status: RouteStatus.OPEN },
      select: ['id', 'name', 'grade', 'open_date'],
    });

    const result: ColdRoute[] = [];

    for (const route of routes) {
      const lastAscent = await this.ascentRepository.findOne({
        where: { route_id: route.id },
        order: { created_at: 'DESC' },
        select: ['created_at'],
      });

      let daysSinceLastAscent: number;
      if (lastAscent) {
        const diffTime = Date.now() - lastAscent.created_at.getTime();
        daysSinceLastAscent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else if (route.open_date) {
        const diffTime = Date.now() - new Date(route.open_date).getTime();
        daysSinceLastAscent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLastAscent = 999;
      }

      if (daysSinceLastAscent >= 7) {
        result.push({
          route_id: route.id,
          route_name: route.name,
          grade: route.grade,
          days_since_last_ascent: daysSinceLastAscent,
          open_date: route.open_date,
        });
      }
    }

    return result.sort((a, b) => b.days_since_last_ascent - a.days_since_last_ascent);
  }

  async getSetterWorkload(gymId: number, month: string): Promise<SetterWorkload[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);
    endDate.setHours(23, 59, 59, 999);

    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return [];
    }

    const setters = await this.userRepository.find({
      where: { gym_id: gymId, role: UserRole.SETTER },
      select: ['id', 'name'],
    });

    const result: SetterWorkload[] = [];

    for (const setter of setters) {
      const routesCount = await this.routeRepository.count({
        where: {
          wall_id: In(wallIds),
          setter_id: setter.id,
          created_at: Between(startDate, endDate),
        },
      });

      result.push({
        setter_id: setter.id,
        setter_name: setter.name,
        routes_set: routesCount,
      });
    }

    return result.sort((a, b) => b.routes_set - a.routes_set);
  }

  async getActiveUsers(gymId: number): Promise<{
    weekly_active_users: number;
    total_members: number;
    avg_routes_per_user: number;
  }> {
    const totalMembers = await this.userRepository.count({
      where: { gym_id: gymId },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
      select: ['id'],
    });
    const wallIds = walls.map((w) => w.id);

    let weeklyActiveUsers = 0;
    let totalRoutesClimbed = 0;

    if (wallIds.length > 0) {
      const routes = await this.routeRepository.find({
        where: { wall_id: In(wallIds) },
        select: ['id'],
      });
      const routeIds = routes.map((r) => r.id);

      if (routeIds.length > 0) {
        const recentAscents = await this.ascentRepository.find({
          where: {
            route_id: In(routeIds),
            created_at: MoreThan(sevenDaysAgo),
          },
          select: ['user_id', 'route_id'],
        });

        const uniqueUsers = new Set<number>();
        const userRouteMap = new Map<number, Set<number>>();

        for (const ascent of recentAscents) {
          uniqueUsers.add(ascent.user_id);
          if (!userRouteMap.has(ascent.user_id)) {
            userRouteMap.set(ascent.user_id, new Set());
          }
          userRouteMap.get(ascent.user_id)!.add(ascent.route_id);
        }

        weeklyActiveUsers = uniqueUsers.size;

        let totalRoutes = 0;
        for (const routeSet of userRouteMap.values()) {
          totalRoutes += routeSet.size;
        }
        totalRoutesClimbed = totalRoutes;
      }
    }

    const avgRoutesPerUser = weeklyActiveUsers > 0
      ? Number((totalRoutesClimbed / weeklyActiveUsers).toFixed(2))
      : 0;

    return {
      weekly_active_users: weeklyActiveUsers,
      total_members: totalMembers,
      avg_routes_per_user: avgRoutesPerUser,
    };
  }

  async getPyramid(userId: number): Promise<Record<string, number>> {
    const ascents = await this.ascentRepository.find({
      where: { user_id: userId },
      relations: ['route'],
    });

    const pyramid: Record<string, number> = {};
    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    for (const ascent of ascents) {
      if (sentTypes.includes(ascent.ascent_type) && ascent.route) {
        pyramid[ascent.route.grade] = (pyramid[ascent.route.grade] || 0) + 1;
      }
    }

    return pyramid;
  }

  async getProgress(userId: number): Promise<{ date: string; count: number }[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ascents = await this.ascentRepository.find({
      where: {
        user_id: userId,
        created_at: MoreThan(thirtyDaysAgo),
      },
      order: { created_at: 'ASC' },
    });

    const dailyCount: Record<string, number> = {};
    for (const ascent of ascents) {
      const dateStr = ascent.created_at.toISOString().split('T')[0];
      dailyCount[dateStr] = (dailyCount[dateStr] || 0) + 1;
    }

    const result = Object.entries(dailyCount).map(([date, count]) => ({
      date,
      count,
    }));

    return result;
  }

  async getStyleAnalysis(userId: number): Promise<Record<string, number>> {
    const ascents = await this.ascentRepository.find({
      where: { user_id: userId },
    });

    const styleCount: Record<string, number> = {};
    for (const ascent of ascents) {
      styleCount[ascent.ascent_type] = (styleCount[ascent.ascent_type] || 0) + 1;
    }

    return styleCount;
  }

  private parseGradeNum(grade: string): number {
    const match = grade.match(/V(\d+)/);
    return match ? parseInt(match[1]) : -1;
  }

  private getGradeCategory(grade: string): string {
    const n = this.parseGradeNum(grade);
    if (n < 0) return '未知';
    if (n <= 2) return '入门 (V0-V2)';
    if (n <= 5) return '初级 (V3-V5)';
    if (n <= 8) return '中级 (V6-V8)';
    if (n <= 11) return '高级 (V9-V11)';
    return '精英 (V12+)';
  }

  private getWallAngleLabel(angle: WallAngle | null): string {
    if (!angle) return '未知角度';
    const labels: Record<string, string> = {
      [WallAngle.SLAB]: '斜面 (Slab)',
      [WallAngle.VERTICAL]: '垂直 (Vertical)',
      [WallAngle.OVERHANG]: '仰角 (Overhang)',
      [WallAngle.ROOF]: '屋檐 (Roof)',
    };
    return labels[angle] || '未知角度';
  }

  async getRouteCompletionAnalysis(
    gymId: number,
    groupBy: 'difficulty' | 'wall_angle' | 'period',
    startDate?: string,
    endDate?: string,
  ): Promise<RouteCompletionAnalysis> {
    const walls = await this.wallRepository.find({
      where: { gym_id: gymId },
    });
    const wallMap = new Map(walls.map((w) => [w.id, w]));
    const wallIds = walls.map((w) => w.id);

    if (wallIds.length === 0) {
      return { groups: [], trend: [] };
    }

    const routeQuery: any = { wall_id: In(wallIds), status: RouteStatus.OPEN };
    const routes = await this.routeRepository.find({
      where: routeQuery,
    });

    if (routes.length === 0) {
      return { groups: [], trend: [] };
    }

    const routeIds = routes.map((r) => r.id);

    const ascentWhere: any = { route_id: In(routeIds) };
    if (startDate && endDate) {
      ascentWhere.created_at = Between(
        new Date(startDate),
        new Date(endDate + ' 23:59:59'),
      );
    }

    const ascents = await this.ascentRepository.find({
      where: ascentWhere,
      relations: ['route'],
    });

    const sentTypes = [AscentType.FLASH, AscentType.ONSIGHT, AscentType.REDPOINT];

    const routeAscentMap = new Map<number, Ascent[]>();
    for (const ascent of ascents) {
      if (!routeAscentMap.has(ascent.route_id)) {
        routeAscentMap.set(ascent.route_id, []);
      }
      routeAscentMap.get(ascent.route_id)!.push(ascent);
    }

    const routeHoldsMap = new Map<number, Hold[]>();
    const allHolds = await this.holdRepository.find({
      where: { route_id: In(routeIds) },
    });
    for (const hold of allHolds) {
      if (!routeHoldsMap.has(hold.route_id)) {
        routeHoldsMap.set(hold.route_id, []);
      }
      routeHoldsMap.get(hold.route_id)!.push(hold);
    }

    const routeItems: CompletionGroupItem[] = [];
    for (const route of routes) {
      const routeAscents = routeAscentMap.get(route.id) || [];
      const attemptCount = routeAscents.length;
      const successCount = routeAscents.filter((a) => sentTypes.includes(a.ascent_type)).length;
      const fallCount = routeAscents.filter((a) => a.ascent_type === AscentType.FALL || a.ascent_type === AscentType.HIGH_POINT).length;
      const wall = wallMap.get(route.wall_id);
      const holds = routeHoldsMap.get(route.id) || [];
      const endHolds = holds.filter((h) => h.type === HoldType.END);
      const fallPositions = endHolds.length > 0 && fallCount > 0
        ? endHolds.map((h) => ({
            x: h.position_x,
            y: h.position_y,
            intensity: Number(((fallCount / Math.max(attemptCount, 1)) * 100).toFixed(1)),
          }))
        : holds.length > 0 && fallCount > 0
          ? holds.slice(0, 3).map((h) => ({
              x: h.position_x,
              y: h.position_y,
              intensity: Number(((fallCount / Math.max(attemptCount, 1)) * 50).toFixed(1)),
            }))
          : [];

      routeItems.push({
        route_id: route.id,
        route_name: route.name,
        grade: route.grade,
        wall_angle: wall?.wall_angle || null,
        wall_name: wall?.name || '未知',
        attempt_count: attemptCount,
        success_count: successCount,
        fall_count: fallCount,
        completion_rate: attemptCount > 0 ? Number(((successCount / attemptCount) * 100).toFixed(1)) : 0,
        fall_positions: fallPositions,
      });
    }

    const groupMap = new Map<string, CompletionGroupItem[]>();

    for (const item of routeItems) {
      let key: string;
      if (groupBy === 'difficulty') {
        key = this.getGradeCategory(item.grade);
      } else if (groupBy === 'wall_angle') {
        key = this.getWallAngleLabel(item.wall_angle as WallAngle | null);
      } else {
        key = '全部';
      }
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    }

    const groups: CompletionGroup[] = [];

    if (groupBy === 'difficulty') {
      const order = ['入门 (V0-V2)', '初级 (V3-V5)', '中级 (V6-V8)', '高级 (V9-V11)', '精英 (V12+)', '未知'];
      for (const key of order) {
        const items = groupMap.get(key);
        if (items) {
          const attemptCount = items.reduce((s, i) => s + i.attempt_count, 0);
          const successCount = items.reduce((s, i) => s + i.success_count, 0);
          const fallCount = items.reduce((s, i) => s + i.fall_count, 0);
          groups.push({
            key,
            label: key,
            attempt_count: attemptCount,
            success_count: successCount,
            fall_count: fallCount,
            completion_rate: attemptCount > 0 ? Number(((successCount / attemptCount) * 100).toFixed(1)) : 0,
            routes: items.sort((a, b) => b.attempt_count - a.attempt_count),
          });
        }
      }
    } else if (groupBy === 'wall_angle') {
      const order = ['斜面 (Slab)', '垂直 (Vertical)', '仰角 (Overhang)', '屋檐 (Roof)', '未知角度'];
      for (const key of order) {
        const items = groupMap.get(key);
        if (items) {
          const attemptCount = items.reduce((s, i) => s + i.attempt_count, 0);
          const successCount = items.reduce((s, i) => s + i.success_count, 0);
          const fallCount = items.reduce((s, i) => s + i.fall_count, 0);
          groups.push({
            key,
            label: key,
            attempt_count: attemptCount,
            success_count: successCount,
            fall_count: fallCount,
            completion_rate: attemptCount > 0 ? Number(((successCount / attemptCount) * 100).toFixed(1)) : 0,
            routes: items.sort((a, b) => b.attempt_count - a.attempt_count),
          });
        }
      }
    } else {
      const items = groupMap.get('全部') || [];
      const attemptCount = items.reduce((s, i) => s + i.attempt_count, 0);
      const successCount = items.reduce((s, i) => s + i.success_count, 0);
      const fallCount = items.reduce((s, i) => s + i.fall_count, 0);
      groups.push({
        key: '全部',
        label: '全部线路',
        attempt_count: attemptCount,
        success_count: successCount,
        fall_count: fallCount,
        completion_rate: attemptCount > 0 ? Number(((successCount / attemptCount) * 100).toFixed(1)) : 0,
        routes: items.sort((a, b) => b.attempt_count - a.attempt_count),
      });
    }

    const monthlyMap = new Map<string, { attempt: number; success: number; fall: number }>();
    for (const ascent of ascents) {
      const d = ascent.created_at;
      const periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(periodKey)) {
        monthlyMap.set(periodKey, { attempt: 0, success: 0, fall: 0 });
      }
      const stats = monthlyMap.get(periodKey)!;
      stats.attempt += 1;
      if (sentTypes.includes(ascent.ascent_type)) {
        stats.success += 1;
      }
      if (ascent.ascent_type === AscentType.FALL || ascent.ascent_type === AscentType.HIGH_POINT) {
        stats.fall += 1;
      }
    }

    const trend: CompletionTrend[] = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, stats]) => ({
        period,
        attempt_count: stats.attempt,
        success_count: stats.success,
        fall_count: stats.fall,
        completion_rate: stats.attempt > 0
          ? Number(((stats.success / stats.attempt) * 100).toFixed(1))
          : 0,
      }));

    return { groups, trend };
  }
}
