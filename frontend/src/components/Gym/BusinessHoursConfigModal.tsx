import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock, CalendarDays, AlertTriangle } from 'lucide-react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import { cn } from '@/lib/utils';
import { useMessage } from '@/hooks/useMessage';
import { gymApi } from '@/utils/api';
import type { BusinessHoursConfig, TimeSegment, SpecialDate, TemporaryClosure } from '@/types';

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)' },
  { value: 'Asia/Taipei', label: '台北时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本时间 (UTC+9)' },
  { value: 'Asia/Seoul', label: '韩国时间 (UTC+9)' },
  { value: 'UTC', label: 'UTC' },
];

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyConfig(gymId: number): BusinessHoursConfig {
  return {
    gymId,
    weeklySchedule: Array.from({ length: 7 }, () => []),
    specialDates: [],
    temporaryClosures: [],
    timezone: 'Asia/Shanghai',
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gymId: number;
  onSaved?: () => void;
}

export default function BusinessHoursConfigModal({ isOpen, onClose, gymId, onSaved }: Props) {
  const { success, error } = useMessage();
  const [config, setConfig] = useState<BusinessHoursConfig>(emptyConfig(gymId));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gymApi.getBusinessHours(gymId);
      const weekly = Array.isArray(data.weeklySchedule) && data.weeklySchedule.length === 7
        ? data.weeklySchedule
        : Array.from({ length: 7 }, (_, i) => data.weeklySchedule?.[i] ?? []);
      setConfig({
        gymId,
        weeklySchedule: weekly,
        specialDates: Array.isArray(data.specialDates) ? data.specialDates : [],
        temporaryClosures: Array.isArray(data.temporaryClosures) ? data.temporaryClosures : [],
        timezone: data.timezone || 'Asia/Shanghai',
      });
    } catch (err) {
      error(err instanceof Error ? err.message : '获取营业时间配置失败');
      setConfig(emptyConfig(gymId));
    } finally {
      setLoading(false);
    }
  }, [gymId, error]);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, loadConfig]);

  const updateDaySegment = (dayIdx: number, segIdx: number, field: keyof TimeSegment, value: string) => {
    setConfig((prev) => {
      const next = prev.weeklySchedule.map((day) => [...day]);
      next[dayIdx] = next[dayIdx].map((seg, i) =>
        i === segIdx ? { ...seg, [field]: value } : seg
      );
      return { ...prev, weeklySchedule: next };
    });
  };

  const addDaySegment = (dayIdx: number) => {
    setConfig((prev) => {
      const next = prev.weeklySchedule.map((day) => [...day]);
      next[dayIdx] = [...next[dayIdx], { open: '09:00', close: '22:00' }];
      return { ...prev, weeklySchedule: next };
    });
  };

  const removeDaySegment = (dayIdx: number, segIdx: number) => {
    setConfig((prev) => {
      const next = prev.weeklySchedule.map((day) => [...day]);
      next[dayIdx] = next[dayIdx].filter((_, i) => i !== segIdx);
      return { ...prev, weeklySchedule: next };
    });
  };

  const addSpecialDate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newDate: SpecialDate = {
      date: today,
      isClosed: true,
      segments: [],
      note: '',
    };
    setConfig((prev) => ({ ...prev, specialDates: [...prev.specialDates, newDate] }));
  };

  const updateSpecialDate = (idx: number, patch: Partial<SpecialDate>) => {
    setConfig((prev) => ({
      ...prev,
      specialDates: prev.specialDates.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const removeSpecialDate = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      specialDates: prev.specialDates.filter((_, i) => i !== idx),
    }));
  };

  const updateSpecialSegment = (dateIdx: number, segIdx: number, field: keyof TimeSegment, value: string) => {
    setConfig((prev) => ({
      ...prev,
      specialDates: prev.specialDates.map((item, i) => {
        if (i !== dateIdx) return item;
        const segments = item.segments.map((seg, si) =>
          si === segIdx ? { ...seg, [field]: value } : seg
        );
        return { ...item, segments };
      }),
    }));
  };

  const addSpecialSegment = (dateIdx: number) => {
    setConfig((prev) => ({
      ...prev,
      specialDates: prev.specialDates.map((item, i) =>
        i === dateIdx ? { ...item, segments: [...item.segments, { open: '09:00', close: '18:00' }] } : item
      ),
    }));
  };

  const removeSpecialSegment = (dateIdx: number, segIdx: number) => {
    setConfig((prev) => ({
      ...prev,
      specialDates: prev.specialDates.map((item, i) =>
        i === dateIdx ? { ...item, segments: item.segments.filter((_, si) => si !== segIdx) } : item
      ),
    }));
  };

  const addClosure = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newClosure: TemporaryClosure = {
      id: genId(),
      startDate: today,
      endDate: today,
      reason: '设备维护',
      message: '今日临时闭店，敬请谅解',
      createdAt: new Date().toISOString(),
    };
    setConfig((prev) => ({ ...prev, temporaryClosures: [...prev.temporaryClosures, newClosure] }));
  };

  const updateClosure = (idx: number, patch: Partial<TemporaryClosure>) => {
    setConfig((prev) => ({
      ...prev,
      temporaryClosures: prev.temporaryClosures.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));
  };

  const removeClosure = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      temporaryClosures: prev.temporaryClosures.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await gymApi.updateBusinessHours(gymId, config);
      success('营业时间配置已保存');
      onSaved?.();
      onClose();
    } catch (err) {
      error(err instanceof Error ? err.message : '保存失败，请检查输入');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="营业时间配置" size="xl" className="max-w-3xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-12 text-center text-theme-text-muted">加载中…</div>
        ) : (
          <div className="space-y-6">
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-climbing-orange-500" />
                <h3 className="font-semibold text-theme-text">时区设置</h3>
              </div>
              <select
                value={config.timezone}
                onChange={(e) => setConfig((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full sm:w-80 px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text focus:outline-none focus:border-climbing-orange-500"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-climbing-orange-500" />
                  <h3 className="font-semibold text-theme-text">每周营业时间</h3>
                </div>
                <span className="text-xs text-theme-text-muted">每天可设置多个营业时段，留空表示全天闭店</span>
              </div>
              <div className="space-y-2">
                {config.weeklySchedule.map((day, dayIdx) => (
                  <div key={dayIdx} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-theme-subtle rounded-lg">
                    <div className="w-16 shrink-0 pt-2">
                      <span className={cn(
                        'inline-block px-2 py-1 rounded text-sm font-medium',
                        day.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      )}>
                        {DAY_LABELS[dayIdx]}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {day.length === 0 && (
                        <p className="text-sm text-theme-text-muted py-1">全天闭店</p>
                      )}
                      {day.map((seg, segIdx) => (
                        <div key={segIdx} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={seg.open}
                            onChange={(e) => updateDaySegment(dayIdx, segIdx, 'open', e.target.value)}
                            className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                          />
                          <span className="text-theme-text-muted text-sm">至</span>
                          <input
                            type="time"
                            value={seg.close}
                            onChange={(e) => updateDaySegment(dayIdx, segIdx, 'close', e.target.value)}
                            className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                          />
                          <button
                            onClick={() => removeDaySegment(dayIdx, segIdx)}
                            className="p-1.5 text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            aria-label="删除时段"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addDaySegment(dayIdx)}
                        className="inline-flex items-center gap-1 text-sm text-climbing-orange-500 hover:text-climbing-orange-400 transition-colors"
                      >
                        <Plus size={14} />
                        添加营业时段
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-climbing-orange-500" />
                  <h3 className="font-semibold text-theme-text">特殊节假日安排</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addSpecialDate}>
                  <Plus size={14} className="mr-1" />
                  添加特殊日期
                </Button>
              </div>
              {config.specialDates.length === 0 ? (
                <p className="text-sm text-theme-text-muted py-3 text-center bg-theme-subtle rounded-lg">暂无特殊日期安排</p>
              ) : (
                <div className="space-y-3">
                  {config.specialDates.map((item, idx) => (
                    <div key={idx} className="p-3 bg-theme-subtle rounded-lg space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateSpecialDate(idx, { date: e.target.value })}
                          className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                        />
                        <label className="inline-flex items-center gap-1.5 text-sm text-theme-text cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isClosed}
                            onChange={(e) => updateSpecialDate(idx, { isClosed: e.target.checked })}
                            className="accent-climbing-orange-500"
                          />
                          全天闭店
                        </label>
                        <input
                          type="text"
                          value={item.note ?? ''}
                          onChange={(e) => updateSpecialDate(idx, { note: e.target.value })}
                          placeholder="备注，如：元旦、春节"
                          className="flex-1 min-w-[140px] px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                        />
                        <button
                          onClick={() => removeSpecialDate(idx)}
                          className="p-1.5 text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          aria-label="删除特殊日期"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {!item.isClosed && (
                        <div className="pl-2 border-l-2 border-theme-border space-y-2">
                          {item.segments.map((seg, segIdx) => (
                            <div key={segIdx} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={seg.open}
                                onChange={(e) => updateSpecialSegment(idx, segIdx, 'open', e.target.value)}
                                className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                              />
                              <span className="text-theme-text-muted text-sm">至</span>
                              <input
                                type="time"
                                value={seg.close}
                                onChange={(e) => updateSpecialSegment(idx, segIdx, 'close', e.target.value)}
                                className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                              />
                              <button
                                onClick={() => removeSpecialSegment(idx, segIdx)}
                                className="p-1 text-theme-text-muted hover:text-red-400 transition-colors"
                                aria-label="删除时段"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addSpecialSegment(idx)}
                            className="inline-flex items-center gap-1 text-sm text-climbing-orange-500 hover:text-climbing-orange-400 transition-colors"
                          >
                            <Plus size={14} />
                            添加营业时段
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-climbing-orange-500" />
                  <h3 className="font-semibold text-theme-text">临时闭店通知</h3>
                </div>
                <Button variant="outline" size="sm" onClick={addClosure}>
                  <Plus size={14} className="mr-1" />
                  添加闭店通知
                </Button>
              </div>
              {config.temporaryClosures.length === 0 ? (
                <p className="text-sm text-theme-text-muted py-3 text-center bg-theme-subtle rounded-lg">暂无临时闭店通知</p>
              ) : (
                <div className="space-y-3">
                  {config.temporaryClosures.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-theme-subtle rounded-lg space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="date"
                          value={item.startDate}
                          onChange={(e) => updateClosure(idx, { startDate: e.target.value })}
                          className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                        />
                        <span className="text-theme-text-muted text-sm">至</span>
                        <input
                          type="date"
                          value={item.endDate}
                          onChange={(e) => updateClosure(idx, { endDate: e.target.value })}
                          className="px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                        />
                        <button
                          onClick={() => removeClosure(idx)}
                          className="ml-auto p-1.5 text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          aria-label="删除闭店通知"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={item.reason}
                        onChange={(e) => updateClosure(idx, { reason: e.target.value })}
                        placeholder="闭店原因，如：设备维护、团建活动"
                        className="w-full px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                      />
                      <input
                        type="text"
                        value={item.message ?? ''}
                        onChange={(e) => updateClosure(idx, { message: e.target.value })}
                        placeholder="对外公示信息，如：今日临时闭店，敬请谅解"
                        className="w-full px-2 py-1.5 bg-theme-card border border-theme-border rounded text-sm text-theme-text focus:outline-none focus:border-climbing-orange-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-theme-border">
        <Button variant="ghost" onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="primary" onClick={handleSave} isLoading={saving} disabled={loading}>保存配置</Button>
      </div>
    </Modal>
  );
}
