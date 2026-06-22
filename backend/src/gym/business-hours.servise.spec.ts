import { BusinessHoursService } from './business-hours.service';
import { GymBusinessHours } from '../entities/gym-business-hours.entity';
import { Repository } from 'typeorm';
import { Gym } from '../entities/gym.entity';

class TestableBusinessHoursService extends BusinessHoursService {
  constructor() {
    super({} as Repository<GymBusinessHours>, {} as Repository<Gym>);
  }

  public testDateDiffDays(fromStr: string, toStr: string): number {
    return (this as any).dateDiffDays(fromStr, toStr);
  }

  public testAddUTCDays(d: Date, days: number): Date {
    return (this as any).addUTCDays(d, days);
  }

  public testToDateString(d: Date): string {
    return (this as any).toDateString(d);
  }

  public testFormatNextOpenLabel(
    next: { dateStr: string; timeStr: string; instant: Date },
    now: Date,
  ): string {
    return (this as any).formatNextOpenLabel(next, now);
  }

  public testFormatClosesAtLabel(
    dateStr: string,
    timeStr: string,
    now: Date,
  ): string {
    return (this as any).formatClosesAtLabel(dateStr, timeStr, now);
  }

  public testDayLabel(offset: number, dayOfWeek: number): string {
    return (this as any).dayLabel(offset, dayOfWeek);
  }
}

describe('BusinessHoursService - 日期计算边界测试', () => {
  let service: TestableBusinessHoursService;

  beforeEach(() => {
    service = new TestableBusinessHoursService();
  });

  describe('dateDiffDays - 日期差值计算', () => {
    it('同月相邻两天差值为 1', () => {
      expect(service.testDateDiffDays('2024-06-15', '2024-06-16')).toBe(1);
    });

    it('同一天差值为 0', () => {
      expect(service.testDateDiffDays('2024-06-15', '2024-06-15')).toBe(0);
    });

    it('1月31日到2月1日差值为 1 (月底月初边界)', () => {
      expect(service.testDateDiffDays('2024-01-31', '2024-02-01')).toBe(1);
    });

    it('2月29日(闰年)到3月1日差值为 1 (闰年2月底)', () => {
      expect(service.testDateDiffDays('2024-02-29', '2024-03-01')).toBe(1);
    });

    it('2月28日(平年)到3月1日差值为 1 (平年2月底)', () => {
      expect(service.testDateDiffDays('2023-02-28', '2023-03-01')).toBe(1);
    });

    it('4月30日到5月1日差值为 1 (小月月底)', () => {
      expect(service.testDateDiffDays('2024-04-30', '2024-05-01')).toBe(1);
    });

    it('12月31日到次年1月1日差值为 1 (跨年)', () => {
      expect(service.testDateDiffDays('2024-12-31', '2025-01-01')).toBe(1);
    });

    it('1月31日到2月2日差值为 2 (月底到月初跨多天)', () => {
      expect(service.testDateDiffDays('2024-01-31', '2024-02-02')).toBe(2);
    });

    it('2月28日(平年)到3月2日差值为 2 (平年2月底)', () => {
      expect(service.testDateDiffDays('2023-02-28', '2023-03-02')).toBe(2);
    });

    it('2月29日(闰年)到3月2日差值为 2 (闰年2月底)', () => {
      expect(service.testDateDiffDays('2024-02-29', '2024-03-02')).toBe(2);
    });

    it('日期倒序差值为负数', () => {
      expect(service.testDateDiffDays('2024-02-01', '2024-01-31')).toBe(-1);
    });

    it('闰年2月29日存在性验证: 2024-02-28 到 2024-03-01 差值为 2', () => {
      expect(service.testDateDiffDays('2024-02-28', '2024-03-01')).toBe(2);
    });

    it('平年2月28日存在性验证: 2023-02-28 到 2023-03-01 差值为 1', () => {
      expect(service.testDateDiffDays('2023-02-28', '2023-03-01')).toBe(1);
    });
  });

  describe('addUTCDays - UTC日期递增', () => {
    it('同月内加 1 天', () => {
      const d = new Date(Date.UTC(2024, 5, 15));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2024-06-16');
    });

    it('1月31日加 1 天 = 2月1日 (月底月初)', () => {
      const d = new Date(Date.UTC(2024, 0, 31));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2024-02-01');
    });

    it('闰年2月29日加 1 天 = 3月1日', () => {
      const d = new Date(Date.UTC(2024, 1, 29));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2024-03-01');
    });

    it('平年2月28日加 1 天 = 3月1日', () => {
      const d = new Date(Date.UTC(2023, 1, 28));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2023-03-01');
    });

    it('4月30日加 1 天 = 5月1日 (小月月底)', () => {
      const d = new Date(Date.UTC(2024, 3, 30));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2024-05-01');
    });

    it('12月31日加 1 天 = 次年1月1日 (跨年)', () => {
      const d = new Date(Date.UTC(2024, 11, 31));
      const result = service.testAddUTCDays(d, 1);
      expect(service.testToDateString(result)).toBe('2025-01-01');
    });

    it('加 2 天: 1月31日 -> 2月2日', () => {
      const d = new Date(Date.UTC(2024, 0, 31));
      const result = service.testAddUTCDays(d, 2);
      expect(service.testToDateString(result)).toBe('2024-02-02');
    });

    it('不修改原日期对象', () => {
      const d = new Date(Date.UTC(2024, 0, 31));
      const originalTime = d.getTime();
      service.testAddUTCDays(d, 5);
      expect(d.getTime()).toBe(originalTime);
    });
  });

  describe('formatNextOpenLabel - 下次开门标签', () => {
    const baseInstant = new Date(Date.UTC(2024, 0, 31, 8, 0, 0));

    it('当天显示"今天 HH:MM 开门"', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 6, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2024-01-31', timeStr: '10:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('今天 10:00 开门');
    });

    it('次日(1月31日->2月1日)显示"明天 HH:MM 开门"', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2024-02-01', timeStr: '09:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('明天 09:00 开门');
    });

    it('后天(1月31日->2月2日)显示"后天 HH:MM 开门"', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2024-02-02', timeStr: '09:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('后天 09:00 开门');
    });

    it('闰年2月28日->3月1日显示"后天 HH:MM 开门" (闰年有2月29日)', () => {
      const now = new Date(Date.UTC(2024, 1, 28, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2024-03-01', timeStr: '09:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('后天 09:00 开门');
    });

    it('平年2月28日->3月1日显示"明天 HH:MM 开门" (平年无2月29日)', () => {
      const now = new Date(Date.UTC(2023, 1, 28, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2023-03-01', timeStr: '09:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('明天 09:00 开门');
    });

    it('超过3天显示月份日期和星期', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2024-02-05', timeStr: '10:00', instant: baseInstant },
        now,
      );
      expect(label).toMatch(/^\d+月\d+日 .+ 10:00 开门$/);
    });

    it('12月31日->次年1月1日显示"明天 HH:MM 开门" (跨年边界)', () => {
      const now = new Date(Date.UTC(2024, 11, 31, 20, 0, 0));
      const label = service.testFormatNextOpenLabel(
        { dateStr: '2025-01-01', timeStr: '10:00', instant: baseInstant },
        now,
      );
      expect(label).toBe('明天 10:00 开门');
    });
  });

  describe('formatClosesAtLabel - 闭店时间标签', () => {
    it('当天显示"今天 HH:MM 闭店"', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 10, 0, 0));
      const label = service.testFormatClosesAtLabel('2024-01-31', '22:00', now);
      expect(label).toBe('今天 22:00 闭店');
    });

    it('1月31日到2月1日跨天营业显示"明天 HH:MM 闭店"', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 23, 0, 0));
      const label = service.testFormatClosesAtLabel('2024-02-01', '02:00', now);
      expect(label).toBe('明天 02:00 闭店');
    });

    it('超过明天显示 MM-DD HH:MM 闭店', () => {
      const now = new Date(Date.UTC(2024, 0, 31, 10, 0, 0));
      const label = service.testFormatClosesAtLabel('2024-02-02', '22:00', now);
      expect(label).toBe('02-02 22:00 闭店');
    });
  });

  describe('dayLabel - 日历标签', () => {
    it('offset 0 显示"今天 · 周X"', () => {
      expect(service.testDayLabel(0, 3)).toBe('今天 · 周三');
    });

    it('offset 1 显示"明天 · 周X"', () => {
      expect(service.testDayLabel(1, 4)).toBe('明天 · 周四');
    });

    it('offset 2 显示"后天 · 周X"', () => {
      expect(service.testDayLabel(2, 5)).toBe('后天 · 周五');
    });

    it('offset >= 3 只显示星期', () => {
      expect(service.testDayLabel(3, 6)).toBe('周六');
      expect(service.testDayLabel(7, 0)).toBe('周日');
    });
  });
});
