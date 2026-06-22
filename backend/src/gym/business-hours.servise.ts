import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GymBusinessHours,
  TimeSegment,
  SpecialDateConfig,
  TemporaryClosure,
} from '../entities/gym-business-hours.entity';
import { Gym } from '../entities/gym.entity';
import { UserRole } from '../entities/user.entity';
import { UpdateBusinessHoursDto } from './dto/business-hours.dto';

export interface CalendarDay {
  date: string;
  day_of_week: number;
  day_label: string;
  is_today: boolean;
  is_open: boolean;
  is_special: boolean;
  special_note: string | null;
  is_temporarily_closed: boolean;
  segments: TimeSegment[];
  open_label: string;
}

export interface BusinessStatusResponse {
  is_open: boolean;
  is_temporarily_closed: boolean;
  closure_message: string | null;
  current_segment: TimeSegment | null;
  closes_at: string | null;
  closes_at_label: string;
  next_open_time: string | null;
  next_open_label: string;
  today_segments: TimeSegment[];
  timezone: string;
  weekly_calendar: CalendarDay[];
  updated_at: string;
}

interface NextOpen {
  dateStr: string;
  timeStr: string;
  instant: Date;
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Shanghai': 480,
  'Asia/Hong_Kong': 480,
  'Asia/Taipei': 480,
  'Asia/Singapore': 480,
  'Asia/Tokyo': 540,
  'Asia/Seoul': 540,
  'UTC': 0,
};

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class BusinessHoursService {
  constructor(
    @InjectRepository(GymBusinessHours)
    private bhRepository: Repository<GymBusinessHours>,
    @InjectRepository(Gym)
    private gymRepository: Repository<Gym>,
  ) {}

  async getConfig(gymId: number): Promise<GymBusinessHours> {
    await this.ensureGymExists(gymId);
    let config = await this.bhRepository.findOne({ where: { gym_id: gymId } });
    if (!config) {
      config = this.bhRepository.create({
        gym_id: gymId,
        weekly_schedule: this.getDefaultWeeklySchedule(),
        special_dates: [],
        temporary_closures: [],
        timezone: 'Asia/Shanghai',
      });
      config = await this.bhRepository.save(config);
    }
    return config;
  }

  async updateConfig(
    gymId: number,
    dto: UpdateBusinessHoursDto,
    user: { id: number; role: UserRole; gym_id?: number } | null,
  ): Promise<GymBusinessHours> {
    await this.ensureGymExists(gymId);
    this.assertCanManage(gymId, user);

    const config = await this.getConfig(gymId);

    if (dto.weekly_schedule !== undefined) {
      config.weekly_schedule = this.normalizeWeeklySchedule(dto.weekly_schedule);
    }
    if (dto.special_dates !== undefined) {
      config.special_dates = this.normalizeSpecialDates(dto.special_dates);
    }
    if (dto.temporary_closures !== undefined) {
      config.temporary_closures = this.normalizeClosures(dto.temporary_closures);
    }
    if (dto.timezone !== undefined) {
      config.timezone = dto.timezone;
    }

    return this.bhRepository.save(config);
  }

  async getStatus(gymId: number): Promise<BusinessStatusResponse> {
    const config = await this.getConfig(gymId);
    return this.computeStatus(config);
  }

  private async ensureGymExists(gymId: number): Promise<void> {
    const gym = await this.gymRepository.findOne({ where: { id: gymId } });
    if (!gym) {
      throw new NotFoundException(`Gym with id ${gymId} not found`);
    }
  }

  private assertCanManage(
    gymId: number,
    user: { id: number; role: UserRole; gym_id?: number } | null,
  ): void {
    if (!user) {
      throw new ForbiddenException('需要登录后操作');
    }
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }
    if (user.role === UserRole.GYM_ADMIN && user.gym_id === gymId) {
      return;
    }
    throw new ForbiddenException('无权管理该岩馆的营业时间');
  }

  private getDefaultWeeklySchedule(): TimeSegment[][] {
    const closed: TimeSegment[] = [];
    const day: TimeSegment[] = [{ open: '10:00', close: '22:00' }];
    return [
      day,
      day,
      day,
      day,
      day,
      [{ open: '09:00', close: '22:00' }],
      [{ open: '09:00', close: '21:00' }],
    ];
  }

  private normalizeWeeklySchedule(input: unknown): TimeSegment[][] {
    if (!Array.isArray(input)) {
      return this.getDefaultWeeklySchedule();
    }
    const result: TimeSegment[][] = [];
    for (let i = 0; i < 7; i++) {
      const rawDay = Array.isArray(input[i]) ? input[i] : [];
      const cleaned: TimeSegment[] = (rawDay as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          open: String(s.open ?? '').slice(0, 5),
          close: String(s.close ?? '').slice(0, 5),
        }))
        .filter((s) => TIME_REGEX.test(s.open) && TIME_REGEX.test(s.close))
        .filter((s) => this.timeToMinutes(s.close) > this.timeToMinutes(s.open));
      cleaned.sort((a, b) => this.timeToMinutes(a.open) - this.timeToMinutes(b.open));
      result.push(cleaned);
    }
    return result;
  }

  private normalizeSpecialDates(input: unknown): SpecialDateConfig[] {
    if (!Array.isArray(input)) return [];
    return (input as unknown[])
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => {
        const date = String(item.date ?? '');
        const isClosed = item.is_closed === true || item.is_closed === 'true';
        const segments = this.normalizeSegments(item.segments);
        const note = String(item.note ?? '');
        return { date, is_closed: isClosed, segments, note };
      })
      .filter((item) => DATE_REGEX.test(item.date));
  }

  private normalizeSegments(input: unknown): TimeSegment[] {
    if (!Array.isArray(input)) return [];
    return (input as unknown[])
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((s) => ({
        open: String(s.open ?? '').slice(0, 5),
        close: String(s.close ?? '').slice(0, 5),
      }))
      .filter((s) => TIME_REGEX.test(s.open) && TIME_REGEX.test(s.close))
      .filter((s) => this.timeToMinutes(s.close) > this.timeToMinutes(s.open))
      .sort((a, b) => this.timeToMinutes(a.open) - this.timeToMinutes(b.open));
  }

  private normalizeClosures(input: unknown): TemporaryClosure[] {
    if (!Array.isArray(input)) return [];
    return (input as unknown[])
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item) => ({
        id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        start_date: String(item.start_date ?? ''),
        end_date: String(item.end_date ?? ''),
        reason: String(item.reason ?? '').slice(0, 100),
        message: String(item.message ?? '').slice(0, 200),
        created_at: String(item.created_at ?? new Date().toISOString()),
      }))
      .filter((item) => DATE_REGEX.test(item.start_date) && DATE_REGEX.test(item.end_date))
      .filter((item) => item.end_date >= item.start_date)
      .filter((item) => item.reason.trim().length > 0);
  }

  private getTimezoneOffsetMinutes(timezone: string): number {
    return TIMEZONE_OFFSETS[timezone] ?? 480;
  }

  private getGymNow(timezone: string): Date {
    const offset = this.getTimezoneOffsetMinutes(timezone);
    return new Date(Date.now() + offset * 60000);
  }

  private toDateString(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private getDayOfWeek(d: Date): number {
    return d.getUTCDay();
  }

  private getNowMinutes(d: Date): number {
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }

  private timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private buildInstant(dateStr: string, timeStr: string, timezone: string): Date {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = timeStr.split(':').map(Number);
    const gymLocalMs = Date.UTC(y, mo - 1, d, h, mi, 0, 0);
    const offset = this.getTimezoneOffsetMinutes(timezone);
    return new Date(gymLocalMs - offset * 60000);
  }

  private dateDiffDays(fromStr: string, toStr: string): number {
    const [fy, fmo, fd] = fromStr.split('-').map(Number);
    const [ty, tmo, td] = toStr.split('-').map(Number);
    const a = Date.UTC(fy, fmo - 1, fd);
    const b = Date.UTC(ty, tmo - 1, td);
    return Math.round((b - a) / 86400000);
  }

  private getSegmentsForDate(
    day: Date,
    config: GymBusinessHours,
  ): { segments: TimeSegment[]; source: 'special' | 'weekly'; note: string | null } {
    const dateStr = this.toDateString(day);
    const special = (config.special_dates || []).find((s) => s.date === dateStr);
    if (special) {
      return {
        segments: special.is_closed ? [] : this.normalizeSegments(special.segments),
        source: 'special',
        note: special.note || null,
      };
    }
    const weekly = config.weekly_schedule || [];
    const segments = this.normalizeSegments(weekly[this.getDayOfWeek(day)] || []);
    return { segments, source: 'weekly', note: null };
  }

  private getActiveClosure(day: Date, config: GymBusinessHours): TemporaryClosure | null {
    const dateStr = this.toDateString(day);
    return (config.temporary_closures || []).find((c) => dateStr >= c.start_date && dateStr <= c.end_date) || null;
  }

  private findNextOpenToday(now: Date, segments: TimeSegment[], timezone: string): NextOpen | null {
    const nowMinutes = this.getNowMinutes(now);
    const dateStr = this.toDateString(now);
    for (const seg of segments) {
      const openM = this.timeToMinutes(seg.open);
      if (openM > nowMinutes) {
        return { dateStr, timeStr: seg.open, instant: this.buildInstant(dateStr, seg.open, timezone) };
      }
    }
    return null;
  }

  private addUTCDays(d: Date, days: number): Date {
    const result = new Date(d.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private findNextOpenFrom(day: Date, config: GymBusinessHours, maxDays: number): NextOpen | null {
    const timezone = config.timezone;
    let cursor = new Date(day.getTime());
    for (let i = 0; i < maxDays; i++) {
      const closure = this.getActiveClosure(cursor, config);
      if (!closure) {
        const info = this.getSegmentsForDate(cursor, config);
        if (info.segments.length > 0) {
          const dateStr = this.toDateString(cursor);
          return { dateStr, timeStr: info.segments[0].open, instant: this.buildInstant(dateStr, info.segments[0].open, timezone) };
        }
      }
      cursor = this.addUTCDays(cursor, 1);
    }
    return null;
  }

  private findNextOpenAfterClosure(closure: TemporaryClosure, config: GymBusinessHours): NextOpen | null {
    const [y, mo, d] = closure.end_date.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, mo - 1, d));
    const dayAfter = this.addUTCDays(lastDay, 1);
    return this.findNextOpenFrom(dayAfter, config, 14);
  }

  private formatNextOpenLabel(next: NextOpen, now: Date): string {
    const nowDateStr = this.toDateString(now);
    const diff = this.dateDiffDays(nowDateStr, next.dateStr);
    if (diff === 0) return `今天 ${next.timeStr} 开门`;
    if (diff === 1) return `明天 ${next.timeStr} 开门`;
    if (diff === 2) return `后天 ${next.timeStr} 开门`;
    const [ny, nmo, nd] = next.dateStr.split('-').map(Number);
    const wd = WEEKDAY_LABELS[new Date(Date.UTC(ny, nmo - 1, nd)).getUTCDay()];
    return `${nmo}月${nd}日 ${wd} ${next.timeStr} 开门`;
  }

  private formatClosesAtLabel(dateStr: string, timeStr: string, now: Date): string {
    const nowDateStr = this.toDateString(now);
    const diff = this.dateDiffDays(nowDateStr, dateStr);
    if (diff === 0) return `今天 ${timeStr} 闭店`;
    if (diff === 1) return `明天 ${timeStr} 闭店`;
    return `${dateStr.slice(5)} ${timeStr} 闭店`;
  }

  private segmentsLabel(segments: TimeSegment[], closure: TemporaryClosure | null): string {
    if (closure) {
      return `临时闭店：${closure.message || closure.reason}`;
    }
    if (!segments || segments.length === 0) {
      return '闭店休息';
    }
    return segments.map((s) => `${s.open}-${s.close}`).join('、');
  }

  private dayLabel(offset: number, dayOfWeek: number): string {
    const wd = WEEKDAY_LABELS[dayOfWeek];
    if (offset === 0) return `今天 · ${wd}`;
    if (offset === 1) return `明天 · ${wd}`;
    if (offset === 2) return `后天 · ${wd}`;
    return `${wd}`;
  }

  private buildCalendar(now: Date, config: GymBusinessHours, days: number): CalendarDay[] {
    const result: CalendarDay[] = [];
    const todayStr = this.toDateString(now);
    for (let i = 0; i < days; i++) {
      const day = this.addUTCDays(now, i);
      const dateStr = this.toDateString(day);
      const closure = this.getActiveClosure(day, config);
      const info = this.getSegmentsForDate(day, config);
      result.push({
        date: dateStr,
        day_of_week: this.getDayOfWeek(day),
        day_label: this.dayLabel(i, this.getDayOfWeek(day)),
        is_today: dateStr === todayStr,
        is_open: !closure && info.segments.length > 0,
        is_special: info.source === 'special',
        special_note: info.note,
        is_temporarily_closed: !!closure,
        segments: info.segments,
        open_label: this.segmentsLabel(info.segments, closure),
      });
    }
    return result;
  }

  private computeStatus(config: GymBusinessHours): BusinessStatusResponse {
    const timezone = config.timezone || 'Asia/Shanghai';
    const now = this.getGymNow(timezone);
    const todayInfo = this.getSegmentsForDate(now, config);
    const nowMinutes = this.getNowMinutes(now);

    let isOpen = false;
    let isTemporarilyClosed = false;
    let closureMessage: string | null = null;
    let currentSegment: TimeSegment | null = null;
    let closesAt: Date | null = null;
    let closesAtLabel = '';
    let nextOpen: NextOpen | null = null;

    const closure = this.getActiveClosure(now, config);

    if (closure) {
      isTemporarilyClosed = true;
      closureMessage = closure.message || closure.reason;
      isOpen = false;
      nextOpen = this.findNextOpenAfterClosure(closure, config);
    } else {
      const segs = todayInfo.segments;
      for (const seg of segs) {
        const openM = this.timeToMinutes(seg.open);
        const closeM = this.timeToMinutes(seg.close);
        if (nowMinutes >= openM && nowMinutes < closeM) {
          isOpen = true;
          currentSegment = seg;
          closesAt = this.buildInstant(this.toDateString(now), seg.close, timezone);
          closesAtLabel = this.formatClosesAtLabel(this.toDateString(now), seg.close, now);
          break;
        }
      }
      if (!isOpen) {
        nextOpen = this.findNextOpenToday(now, segs, timezone);
        if (!nextOpen) {
          const tomorrow = this.addUTCDays(now, 1);
          nextOpen = this.findNextOpenFrom(tomorrow, config, 7);
        }
      }
    }

    const nextOpenLabel = nextOpen ? this.formatNextOpenLabel(nextOpen, now) : '暂无营业安排';

    return {
      is_open: isOpen,
      is_temporarily_closed: isTemporarilyClosed,
      closure_message: closureMessage,
      current_segment: currentSegment,
      closes_at: closesAt ? closesAt.toISOString() : null,
      closes_at_label: closesAtLabel,
      next_open_time: nextOpen ? nextOpen.instant.toISOString() : null,
      next_open_label: nextOpenLabel,
      today_segments: todayInfo.segments,
      timezone,
      weekly_calendar: this.buildCalendar(now, config, 7),
      updated_at: config.updated_at.toISOString(),
    };
  }
}
