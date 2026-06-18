import { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Settings,
  LogOut,
  Edit,
  Ruler,
  Clock,
  Heart,
  Target,
  Gauge,
  ChevronRight,
  Award,
  TrendingUp,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import RoleTag from '@/components/UI/RoleTag';
import useAuthStore from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import type { UserRole, UserBadge, BadgeStats, BadgeProgressStats } from '@/types';
import { profileApi, ascentApi, badgeApi } from '@/utils/api';
import {
  BadgeGallery,
  BadgeUnlockModal,
  BadgeDetailModal,
  BadgePoster,
  BadgeCard,
} from '@/components/Badge';

const preferredStyles = [
  { label: '捏点', value: 'crimp' },
  { label: '动态', value: 'dyno' },
  { label: '耐力', value: 'endurance' },
];

function parseGrade(grade: string): number {
  const match = grade.match(/V(\d+)/);
  return match ? parseInt(match[1]) : -1;
}

const GOAL_KEY = 'climbingGoal';

function loadGoal(): { targetGrade: string; targetDate: string } {
  if (typeof window === 'undefined') return { targetGrade: 'V7', targetDate: '' };
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        targetGrade: parsed.targetGrade || 'V7',
        targetDate: parsed.targetDate || '',
      };
    }
  } catch {
    // ignore parse error
  }
  return { targetGrade: 'V7', targetDate: '' };
}

function saveGoal(goal: { targetGrade: string; targetDate: string }): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const initialGoal = loadGoal();
  const [targetGrade, setTargetGrade] = useState(initialGoal.targetGrade);
  const [targetDate, setTargetDate] = useState(initialGoal.targetDate);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [stats, setStats] = useState({
    totalAscents: 0,
    maxGrade: '-',
    climbingDays: 0,
    monthsClimbing: 0,
  });
  const [calibration, setCalibration] = useState<{
    avgDeviation: number;
    totalVotes: number;
    trend: 'tight' | 'accurate' | 'loose';
    distribution: number[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'badges'>('overview');
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [badgeStats, setBadgeStats] = useState<BadgeStats | null>(null);
  const [badgeProgressStats, setBadgeProgressStats] = useState<BadgeProgressStats | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [unlockBadge, setUnlockBadge] = useState<UserBadge | null>(null);
  const [posterBadgeId, setPosterBadgeId] = useState<number | null>(null);
  const [checkingBadges, setCheckingBadges] = useState(false);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    setBadgesLoading(true);
    try {
      const [badgeData, progressData] = await Promise.all([
        badgeApi.getMyBadges(),
        badgeApi.getBadgeStats(),
      ]);
      setBadges(badgeData.badges);
      setBadgeStats(badgeData.stats);
      setBadgeProgressStats(progressData);
    } catch (err) {
      console.error('获取徽章数据失败:', err);
    } finally {
      setBadgesLoading(false);
    }
  }, [user]);

  const checkAndUnlockBadges = useCallback(async () => {
    if (!user) return;
    setCheckingBadges(true);
    try {
      const result = await badgeApi.checkAndUnlockBadges();
      if (result.newlyUnlocked.length > 0) {
        setUnlockBadge(result.newlyUnlocked[0]);
      }
      await fetchBadges();
    } catch (err) {
      console.error('检查徽章失败:', err);
    } finally {
      setCheckingBadges(false);
    }
  }, [user, fetchBadges]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [ascentData, calibrationData] = await Promise.all([
          ascentApi.getAscents(),
          profileApi.getCalibration(user.id).catch(() => null),
        ]);

        const completedAscents = ascentData.filter((a) =>
          a.ascentType === 'flash' || a.ascentType === 'redpoint' || a.ascentType === 'onsight'
        );
        const grades = completedAscents
          .map((a) => parseGrade(a.routeGrade || ''))
          .filter((g) => g >= 0);
        const maxGrade = grades.length > 0 ? `V${Math.max(...grades)}` : '-';
        const climbingDays = new Set(
          ascentData.map((a) => a.createdAt.split('T')[0])
        ).size;

        const startDate = ascentData.length > 0
          ? new Date(ascentData[ascentData.length - 1].createdAt)
          : new Date(user.createdAt);
        const now = new Date();
        const monthsClimbing = Math.max(
          1,
          (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
        );

        setStats({
          totalAscents: completedAscents.length,
          maxGrade,
          climbingDays,
          monthsClimbing,
        });

        if (calibrationData && typeof calibrationData === 'object') {
          const cal = calibrationData as Record<string, unknown>;
          const avgDev = typeof cal.avgDeviation === 'number' ? cal.avgDeviation : 0.3;
          setCalibration({
            avgDeviation: avgDev,
            totalVotes: typeof cal.totalVotes === 'number' ? cal.totalVotes : 0,
            trend: avgDev > 0.2 ? 'tight' : avgDev < -0.2 ? 'loose' : 'accurate',
            distribution: Array.isArray(cal.distribution)
              ? (cal.distribution as number[])
              : [5, 12, 18, 5, 2],
          });
        } else {
          setCalibration({
            avgDeviation: 0.3,
            totalVotes: 0,
            trend: 'accurate',
            distribution: [5, 12, 18, 5, 2],
          });
        }
      } catch (err) {
        console.error('获取用户数据失败:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchBadges();
  }, [user, fetchBadges]);

  const handleGeneratePoster = (badgeId: number) => {
    setPosterBadgeId(badgeId);
    setSelectedBadge(null);
    setUnlockBadge(null);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    try {
      saveGoal({ targetGrade, targetDate });
      setIsEditingGoal(false);
    } catch (err) {
      console.error('保存目标失败:', err);
    } finally {
      setSavingGoal(false);
    }
  };

  const currentMaxGradeNum = parseGrade(stats.maxGrade);
  const targetGradeNum = parseGrade(targetGrade);
  const progressPercent = targetGradeNum > 0 && currentMaxGradeNum >= 0
    ? Math.min(100, Math.round((currentMaxGradeNum / targetGradeNum) * 100))
    : 0;

  const userRole: UserRole = (user?.role as UserRole) || 'guest';
  const calibrationTrend = calibration?.trend || 'accurate';
  const trendLabel = calibrationTrend === 'loose' ? '偏松' : calibrationTrend === 'tight' ? '偏紧' : '准确';
  const trendColor = calibrationTrend === 'loose' ? 'text-green-400' : calibrationTrend === 'tight' ? 'text-red-400' : 'text-yellow-400';
  const trendBgColor = calibrationTrend === 'loose' ? 'bg-green-500/20 border-green-500/50' : calibrationTrend === 'tight' ? 'bg-red-500/20 border-red-500/50' : 'bg-yellow-500/20 border-yellow-500/50';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
      </div>
    );
  }

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const recentBadges = unlockedBadges.slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">个人中心</h1>
        <p className="text-theme-text-muted mt-1">管理你的账户信息和攀岩目标</p>
      </div>

      {badgeStats && (
        <Card>
          <div className="p-4 border-b border-theme-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Award size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text">我的成就</h3>
                  <p className="text-xs text-theme-text-muted">
                    已解锁 {badgeStats.unlocked}/{badgeStats.total} 个徽章
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  <p className="text-xl font-bold text-amber-500">{badgeStats.totalPoints}</p>
                  <p className="text-xs text-theme-text-muted">总积分</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkAndUnlockBadges}
                  disabled={checkingBadges}
                >
                  {checkingBadges ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <RefreshCw size={14} className="mr-1" />
                  )}
                  检查成就
                </Button>
              </div>
            </div>
          </div>
          <div className="p-4">
            {badgesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-climbing-orange-500" />
              </div>
            ) : recentBadges.length > 0 ? (
              <div className="flex items-center gap-6 overflow-x-auto pb-2">
                {recentBadges.map((userBadge) => (
                  <div
                    key={userBadge.id}
                    onClick={() => setSelectedBadge(userBadge)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <BadgeCard
                      userBadge={userBadge}
                      size="md"
                      showProgress={false}
                    />
                  </div>
                ))}
                <button
                  onClick={() => setActiveTab('badges')}
                  className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-theme-border hover:border-climbing-orange-500 transition-colors group"
                >
                  <ChevronRight size={24} className="text-theme-text-muted group-hover:text-climbing-orange-500 mb-1" />
                  <span className="text-xs text-theme-text-muted group-hover:text-climbing-orange-500">查看全部</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Award size={32} className="mx-auto text-theme-border mb-2" />
                <p className="text-theme-text-muted text-sm">暂无已解锁的徽章</p>
                <p className="text-theme-text-muted text-xs mt-1">完成攀岩成就来解锁徽章吧！</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex gap-2 border-b border-theme-border">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${
            activeTab === 'overview'
              ? 'text-climbing-orange-500'
              : 'text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          概览
          {activeTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-climbing-orange-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2.5 font-medium text-sm transition-colors relative ${
            activeTab === 'badges'
              ? 'text-climbing-orange-500'
              : 'text-theme-text-secondary hover:text-theme-text'
          }`}
        >
          成就徽章
          {badgeStats && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-climbing-orange-500/20 text-climbing-orange-500">
              {badgeStats.unlocked}/{badgeStats.total}
            </span>
          )}
          {activeTab === 'badges' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-climbing-orange-500" />
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-climbing-orange-500/30">
                    <User size={40} className="text-white" />
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-theme-hover border-2 border-theme-card rounded-full flex items-center justify-center hover:bg-theme-border transition-colors">
                    <Edit size={12} className="text-theme-text-secondary" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold text-theme-text">
                      {user?.name || '攀岩爱好者'}
                    </h2>
                    <RoleTag role={userRole} highlight="current" size="sm" />
                    {userRole === 'verified_climber' && (
                      <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        已认证
                      </span>
                    )}
                  </div>
                  <p className="text-theme-text-muted">{user?.email || '未设置邮箱'}</p>
                  <p className="text-sm text-theme-text-muted mt-1">ID: {user?.id ?? '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-theme-border">
                <div className="text-center p-3 bg-theme-subtle/50 rounded-lg">
                  <p className="text-2xl font-bold text-climbing-orange-500">{stats.totalAscents}</p>
                  <p className="text-xs text-theme-text-muted mt-1">完攀线路</p>
                </div>
                <div className="text-center p-3 bg-theme-subtle/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{stats.maxGrade}</p>
                  <p className="text-xs text-theme-text-muted mt-1">最高难度</p>
                </div>
                <div className="text-center p-3 bg-theme-subtle/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-400">{stats.climbingDays}</p>
                  <p className="text-xs text-theme-text-muted mt-1">攀岩天数</p>
                </div>
                <div className="text-center p-3 bg-theme-subtle/50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{stats.monthsClimbing}</p>
                  <p className="text-xs text-theme-text-muted mt-1">岩龄(月)</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-climbing-orange-500/20">
                  <Target size={20} className="text-climbing-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-theme-text">目标设定</h3>
                  <p className="text-xs text-theme-text-muted">设定你的攀岩目标，追踪进步</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
              >
                <Edit size={14} className="mr-1" />
                编辑目标
              </Button>
            </div>
            <div className="p-5">
              {isEditingGoal ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1.5">目标难度</label>
                    <select
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      className="w-full bg-theme-subtle border border-theme-border rounded-lg px-4 py-2.5 text-theme-text focus:outline-none focus:border-climbing-orange-500"
                    >
                      <option value="V3">V3</option>
                      <option value="V4">V4</option>
                      <option value="V5">V5</option>
                      <option value="V6">V6</option>
                      <option value="V7">V7</option>
                      <option value="V8">V8</option>
                      <option value="V9">V9</option>
                      <option value="V10">V10</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1.5">目标截止日期</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-theme-subtle border border-theme-border rounded-lg px-4 py-2.5 text-theme-text focus:outline-none focus:border-climbing-orange-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsEditingGoal(false)}
                    >
                      取消
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveGoal}
                      disabled={savingGoal}
                    >
                      {savingGoal ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-theme-text-secondary">当前目标</p>
                      <p className="text-2xl font-bold text-climbing-orange-500 mt-1">{targetGrade}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-theme-text-secondary">截止日期</p>
                      <p className="text-theme-text font-medium mt-1">{targetDate || '未设定'}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-theme-text-secondary">完成进度</span>
                      <span className="text-sm font-medium text-theme-text">{progressPercent}%</span>
                    </div>
                    <div className="h-3 bg-theme-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-theme-text-muted">
                      <span>当前：{stats.maxGrade}</span>
                      <span>目标：{targetGrade}</span>
                    </div>
                  </div>

                  {progressPercent < 100 && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <TrendingUp size={16} className="text-green-400 flex-shrink-0" />
                      <p className="text-sm text-green-400">
                        坚持训练，你一定可以达成目标！
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-theme-border flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Gauge size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-theme-text">难度校准</h3>
                <p className="text-xs text-theme-text-muted">你的难度投票与官方定级的偏差分析</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-6 mb-6">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto ${trendBgColor}`}>
                    <Award size={28} className={trendColor} />
                  </div>
                  <p className={`font-semibold mt-2 ${trendColor}`}>{trendLabel}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-theme-text-secondary">平均偏差</span>
                    <span className="text-lg font-bold text-theme-text">
                      {calibration ? (calibration.avgDeviation >= 0 ? '+' : '') + calibration.avgDeviation.toFixed(1) : '-'} 级
                    </span>
                  </div>
                  <p className="text-sm text-theme-text-muted">
                    基于你投票的 <span className="text-theme-text font-medium">{calibration?.totalVotes ?? 0}</span> 条线路计算
                  </p>
                </div>
              </div>

              <div className="p-4 bg-theme-subtle/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-theme-text-secondary space-y-2">
                    <p>
                      你的定级投票平均比官方定级
                      <span className={`font-medium ${trendColor}`}>
                        {calibrationTrend === 'loose' ? '偏松 ' : calibrationTrend === 'tight' ? '偏紧 ' : '准确 '}
                        {calibration ? Math.abs(calibration.avgDeviation).toFixed(1) : '0'} 级
                      </span>
                      {calibrationTrend === 'loose' && '，说明你对难度的判断相对保守。'}
                      {calibrationTrend === 'tight' && '，说明你对难度的判断相对激进。'}
                      {calibrationTrend === 'accurate' && '，说明你对难度的判断非常准确。'}
                    </p>
                    <p>
                      系统会根据你的投票历史，在推荐线路时自动调整难度参考，帮助你找到更适合的挑战。
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-theme-text-muted">投票分布</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {(calibration?.distribution || [0, 0, 0, 0, 0]).map((value, i) => {
                    const maxValue = Math.max(...(calibration?.distribution || [1]));
                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const colors = ['bg-red-400', 'bg-yellow-400', 'bg-green-400', 'bg-yellow-400', 'bg-red-400'];
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-t ${colors[i]} transition-all`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-xs text-theme-text-muted">{value}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-theme-text-muted mt-1">
                  <span>偏紧</span>
                  <span>准确</span>
                  <span>偏松</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="p-5 border-b border-theme-border">
              <h3 className="font-semibold text-theme-text">基本信息</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover">
                  <User size={16} className="text-theme-text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-theme-text-muted">用户名</p>
                  <p className="text-theme-text font-medium">{user?.name || '攀岩爱好者'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover">
                  <Mail size={16} className="text-theme-text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-theme-text-muted">邮箱</p>
                  <p className="text-theme-text font-medium">{user?.email || '未设置'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover">
                  <Phone size={16} className="text-theme-text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-theme-text-muted">手机号</p>
                  <p className="text-theme-text font-medium">{user?.phone || '未设置'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-theme-hover">
                  <Calendar size={16} className="text-theme-text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-theme-text-muted">加入时间</p>
                  <p className="text-theme-text font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-theme-border">
              <h3 className="font-semibold text-theme-text">身体数据</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Ruler size={16} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-theme-text-muted">身高</p>
                  <p className="text-theme-text font-medium">-- cm</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Ruler size={16} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-theme-text-muted">臂展</p>
                  <p className="text-theme-text font-medium">-- cm</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Clock size={16} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-theme-text-muted">岩龄</p>
                  <p className="text-theme-text font-medium">
                    {stats.monthsClimbing >= 12
                      ? `${Math.floor(stats.monthsClimbing / 12)}年${stats.monthsClimbing % 12}个月`
                      : `${stats.monthsClimbing}个月`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Heart size={16} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-theme-text-muted">偏好风格</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preferredStyles.map((style) => (
                      <span
                        key={style.value}
                        className="px-2 py-0.5 text-xs bg-climbing-orange-500/20 text-climbing-orange-400 rounded"
                      >
                        {style.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 border-b border-theme-border">
              <h3 className="font-semibold text-theme-text">设置</h3>
            </div>
            <div className="p-3">
              <button className="w-full flex items-center justify-between p-3 hover:bg-theme-hover rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Settings size={18} className="text-theme-text-secondary" />
                  <span className="text-theme-text">账号设置</span>
                </div>
                <ChevronRight size={16} className="text-theme-text-muted" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-theme-hover rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-theme-text-secondary" />
                  <span className="text-theme-text">通知设置</span>
                </div>
                <ChevronRight size={16} className="text-theme-text-muted" />
              </button>
              <button className="w-full flex items-center justify-between p-3 hover:bg-theme-hover rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-theme-text-secondary" />
                  <span className="text-theme-text">隐私安全</span>
                </div>
                <ChevronRight size={16} className="text-theme-text-muted" />
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-between p-3 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="text-red-500" />
                  <span className="text-red-500">{loggingOut ? '退出中...' : '退出登录'}</span>
                </div>
                <ChevronRight size={16} className="text-red-500/50" />
              </button>
            </div>
          </Card>
        </div>
      </div>
      )}

      {activeTab === 'badges' && badgeStats && (
        <div>
          {badgesLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
            </div>
          ) : (
            <BadgeGallery
              badges={badges}
              stats={badgeStats}
              onBadgeClick={setSelectedBadge}
            />
          )}
        </div>
      )}

      {selectedBadge && (
        <BadgeDetailModal
          isOpen={!!selectedBadge}
          onClose={() => setSelectedBadge(null)}
          userBadge={selectedBadge}
          onGeneratePoster={() => handleGeneratePoster(selectedBadge.badgeId)}
        />
      )}

      {unlockBadge && (
        <BadgeUnlockModal
          isOpen={!!unlockBadge}
          onClose={() => setUnlockBadge(null)}
          badge={unlockBadge}
          onGeneratePoster={() => handleGeneratePoster(unlockBadge.badgeId)}
        />
      )}

      {posterBadgeId !== null && (
        <BadgePoster
          isOpen={posterBadgeId !== null}
          onClose={() => setPosterBadgeId(null)}
          badgeId={posterBadgeId}
        />
      )}
    </div>
  );
}

function Bell({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function Shield({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
