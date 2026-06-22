import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Calendar,
  ChevronRight,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Sunrise,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import BusinessHoursConfigModal from '@/components/Gym/BusinessHoursConfigModal';
import { useGymStore } from '@/store/gym';
import useAuthStore from '@/store/auth';
import { gymApi } from '@/utils/api';
import { cn } from '@/lib/utils';
import type { BusinessStatus, Gym } from '@/types';

function formatRemaining(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  const diff = target - now;
  if (diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}天 ${hours}小时 ${mins}分`;
  if (hours > 0) return `${hours}小时 ${mins}分 ${secs}秒`;
  return `${mins}分 ${secs}秒`;
}

export default function GymDetail() {
  const { gymId } = useParams<{ gymId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { gyms, currentGym, fetchGyms, setCurrentGym } = useGymStore();
  const [showGymDropdown, setShowGymDropdown] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [status, setStatus] = useState<BusinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [gym, setGym] = useState<Gym | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resolvedGymId = (() => {
    const parsed = Number(gymId);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    return currentGym?.id ?? null;
  })();

  const loadStatus = useCallback(async (id: number) => {
    try {
      const data = await gymApi.getBusinessStatus(id);
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  useEffect(() => {
    if (resolvedGymId == null) return;
    setLoading(true);
    loadStatus(resolvedGymId);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      loadStatus(resolvedGymId);
    }, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resolvedGymId, loadStatus]);

  useEffect(() => {
    const target = status?.closesAt ?? status?.nextOpenTime ?? null;
    if (!target) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status?.closesAt, status?.nextOpenTime]);

  useEffect(() => {
    if (resolvedGymId == null) return;
    gymApi.getGymById(resolvedGymId).then(setGym).catch(() => setGym(null));
  }, [resolvedGymId]);

  useEffect(() => {
    if (resolvedGymId && currentGym?.id !== resolvedGymId) {
      const found = gyms.find((g) => g.id === resolvedGymId);
      if (found) setCurrentGym(found);
    }
  }, [resolvedGymId, gyms, currentGym, setCurrentGym]);

  const canManage = !!user && (
    user.role === 'platform_admin' ||
    (user.role === 'gym_admin' && user.gymId === resolvedGymId)
  );

  const displayGym = gym ?? currentGym;

  const remaining = status
    ? status.isOpen
      ? formatRemaining(status.closesAt, now)
      : formatRemaining(status.nextOpenTime, now)
    : null;

  const handleSelectGym = (g: Gym) => {
    setCurrentGym(g);
    setShowGymDropdown(false);
    navigate(`/gyms/${g.id}`);
  };

  if (loading && !status) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-theme-subtle rounded animate-pulse" />
        <Card className="p-8">
          <div className="h-32 bg-theme-subtle rounded animate-pulse" />
        </Card>
      </div>
    );
  }

  if (resolvedGymId == null) {
    return (
      <div className="text-center py-20 text-theme-text-muted">
        请先选择一个岩馆
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-theme-text-muted mb-1">
            <Building2 size={14} />
            <span>岩馆信息</span>
          </div>
          <h1 className="text-2xl font-bold text-theme-text">{displayGym?.name ?? '岩馆详情'}</h1>
          {displayGym?.address && (
            <p className="text-theme-text-muted mt-1 flex items-center gap-1.5">
              <MapPin size={14} />
              {displayGym.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowGymDropdown(!showGymDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-theme-card border border-theme-border rounded-lg hover:border-climbing-orange-500 transition-colors text-sm"
            >
              <Building2 size={16} className="text-climbing-orange-500" />
              <span className="text-theme-text">{displayGym?.name ?? '切换岩馆'}</span>
              <ChevronRight size={14} className={cn('text-theme-text-muted transition-transform', showGymDropdown && 'rotate-90')} />
            </button>
            {showGymDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-theme-card border border-theme-border rounded-lg shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
                {gyms.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGym(g)}
                    className={cn(
                      'w-full px-4 py-3 text-left hover:bg-theme-hover transition-colors',
                      resolvedGymId === g.id ? 'bg-theme-hover' : ''
                    )}
                  >
                    <p className="font-medium text-theme-text text-sm">{g.name}</p>
                    <p className="text-xs text-theme-text-muted truncate">{g.address}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {canManage && (
            <Button variant="outline" size="md" onClick={() => setShowConfig(true)}>
              <Settings size={16} className="mr-1.5" />
              配置营业时间
            </Button>
          )}
        </div>
      </div>

      {status?.isTemporarilyClosed && status.closureMessage && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">临时闭店通知</p>
            <p className="text-sm text-theme-text mt-1">{status.closureMessage}</p>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="p-6 flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              {status?.isOpen ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 text-green-400 rounded-full font-semibold">
                  <CheckCircle2 size={20} />
                  营业中
                </span>
              ) : status?.isTemporarilyClosed ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 rounded-full font-semibold">
                  <AlertTriangle size={20} />
                  临时闭店
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/15 text-gray-400 rounded-full font-semibold">
                  <XCircle size={20} />
                  已闭店
                </span>
              )}
              <span className="text-xs text-theme-text-muted">时区 {status?.timezone}</span>
            </div>

            {status?.isOpen ? (
              <div className="space-y-2">
                <p className="text-theme-text-muted text-sm">当前营业时段</p>
                {status.currentSegment && (
                  <p className="text-2xl font-bold text-theme-text">
                    {status.currentSegment.open} - {status.currentSegment.close}
                  </p>
                )}
                <p className="text-sm text-theme-text-secondary">
                  {status.closesAtLabel}
                  {remaining && <span className="ml-2 text-climbing-orange-500">（剩余 {remaining}）</span>}
                </p>
              </div>
            ) : status?.isTemporarilyClosed ? (
              <div className="space-y-2">
                <p className="text-theme-text-muted text-sm">下次开门</p>
                <p className="text-xl font-bold text-theme-text">{status.nextOpenLabel}</p>
                {remaining && <p className="text-sm text-climbing-orange-500">倒计时 {remaining}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-theme-text-muted text-sm flex items-center gap-1.5">
                  <Sunrise size={14} />
                  下次开门时间
                </p>
                <p className="text-xl font-bold text-theme-text">{status?.nextOpenLabel ?? '暂无营业安排'}</p>
                {remaining && <p className="text-sm text-climbing-orange-500">倒计时 {remaining}</p>}
              </div>
            )}
          </div>

          <div className="lg:w-72 lg:border-l lg:border-theme-border lg:pl-6">
            <p className="text-theme-text-muted text-sm mb-2 flex items-center gap-1.5">
              <Clock size={14} />
              今日营业时段
            </p>
            {status && status.todaySegments.length > 0 ? (
              <div className="space-y-1.5">
                {status.todaySegments.map((seg, i) => {
                  const isCurrent = status.isOpen && status.currentSegment?.open === seg.open && status.currentSegment?.close === seg.close;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                        isCurrent ? 'bg-green-500/15 text-green-400 font-medium' : 'bg-theme-subtle text-theme-text'
                      )}
                    >
                      <span>{seg.open} - {seg.close}</span>
                      {isCurrent && <span className="text-xs">进行中</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-theme-text-muted">今日闭店休息</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 border-b border-theme-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme-text flex items-center gap-2">
            <Calendar size={18} className="text-climbing-orange-500" />
            未来七天营业日历
          </h2>
          <span className="text-xs text-theme-text-muted">每分钟自动刷新</span>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {status?.weeklyCalendar.map((day) => (
            <div
              key={day.date}
              className={cn(
                'p-3 rounded-xl border transition-all',
                day.isToday
                  ? 'border-climbing-orange-500 bg-climbing-orange-500/5'
                  : 'border-theme-border bg-theme-subtle'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-theme-text">{day.dayLabel}</span>
                {day.isToday && <span className="text-[10px] text-climbing-orange-500 font-semibold">今日</span>}
              </div>
              <div className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium mb-2',
                day.isTemporarilyClosed
                  ? 'bg-red-500/15 text-red-400'
                  : day.isOpen
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-gray-500/15 text-gray-400'
              )}>
                {day.isTemporarilyClosed ? '闭店' : day.isOpen ? '营业' : '休息'}
              </div>
              <div className="space-y-0.5">
                {day.segments.length > 0 ? (
                  day.segments.map((seg, i) => (
                    <p key={i} className="text-[11px] text-theme-text-secondary">{seg.open}-{seg.close}</p>
                  ))
                ) : (
                  <p className="text-[11px] text-theme-text-muted">{day.isTemporarilyClosed ? '临时闭店' : '全天休息'}</p>
                )}
              </div>
              {day.isSpecial && day.specialNote && (
                <p className="mt-2 text-[10px] text-climbing-orange-400 truncate" title={day.specialNote}>
                  {day.specialNote}
                </p>
              )}
              {day.isTemporarilyClosed && (
                <p className="mt-1 text-[10px] text-red-400 truncate" title={day.openLabel}>临时闭店</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <BusinessHoursConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        gymId={resolvedGymId}
        onSaved={() => loadStatus(resolvedGymId)}
      />
    </div>
  );
}
