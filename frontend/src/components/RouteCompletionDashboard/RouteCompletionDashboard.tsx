import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  Filter,
  ChevronRight,
  ChevronDown,
  Loader2,
  ArrowLeft,
  Target,
  Flame,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Map,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import Card from '@/components/UI/Card';
import { analyticsApi } from '@/utils/api';
import { useAuthStore } from '@/store/auth';
import type { RouteCompletionAnalysis, CompletionGroup, CompletionGroupItem } from '@/types';

type GroupBy = 'difficulty' | 'wall_angle' | 'period';
type ChartType = 'bar' | 'line';

const groupByOptions: { value: GroupBy; label: string }[] = [
  { value: 'difficulty', label: '按难度' },
  { value: 'wall_angle', label: '按岩壁角度' },
  { value: 'period', label: '按时间段' },
];

const chartTypeOptions: { value: ChartType; label: string; icon: typeof BarChartIcon }[] = [
  { value: 'bar', label: '柱状图', icon: BarChartIcon },
  { value: 'line', label: '折线图', icon: LineChartIcon },
];

const barColors = ['#FF6B35', '#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-theme-text mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function FallPositionHeatmap({ routes }: { routes: CompletionGroupItem[] }) {
  const allPositions = useMemo(() => {
    return routes.flatMap((r) => r.fallPositions);
  }, [routes]);

  const gridSize = 10;
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));
    for (const pos of allPositions) {
      const col = Math.min(Math.floor(pos.x * gridSize / 100), gridSize - 1);
      const row = Math.min(Math.floor(pos.y * gridSize / 100), gridSize - 1);
      g[row][col] += pos.intensity;
    }
    return g;
  }, [allPositions, gridSize]);

  const maxVal = useMemo(() => {
    return Math.max(...grid.flat(), 1);
  }, [grid]);

  if (allPositions.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-theme-text-muted text-sm">
        暂无掉落位置数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-theme-text-muted mb-1">
        <Map size={12} />
        <span>掉落位置热力图 (基于岩点位置)</span>
      </div>
      <div className="relative bg-theme-subtle rounded-lg p-2 border border-theme-border">
        <div
          className="grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {grid.flat().map((value, idx) => {
            const intensity = value / maxVal;
            const r = Math.round(255 * intensity);
            const g = Math.round(107 * (1 - intensity) + 53 * intensity);
            const b = Math.round(53 * (1 - intensity));
            return (
              <div
                key={idx}
                className="aspect-square rounded-sm transition-all"
                style={{
                  backgroundColor: value > 0
                    ? `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`
                    : 'var(--color-hover)',
                }}
                title={`强度: ${value.toFixed(1)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-theme-text-muted">
          <span>底部</span>
          <span>岩壁高度</span>
          <span>顶部</span>
        </div>
        <div className="flex items-center gap-2 mt-1 justify-center">
          <span className="text-[10px] text-theme-text-muted">低</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div
                key={v}
                className="w-4 h-2 rounded-sm"
                style={{
                  backgroundColor: `rgba(${Math.round(255 * v)}, ${Math.round(107 * (1 - v) + 53 * v)}, ${Math.round(53 * (1 - v))}, ${0.3 + v * 0.7})`,
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-theme-text-muted">高</span>
        </div>
      </div>
    </div>
  );
}

function RouteDrillDown({ routes, onBack }: { routes: CompletionGroupItem[]; onBack: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h4 className="text-sm font-medium text-theme-text">线路明细</h4>
        <span className="text-xs text-theme-text-muted">({routes.length} 条线路)</span>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {routes.map((route) => (
          <div
            key={route.routeId}
            onClick={() => navigate(`/routes/${route.routeId}`)}
            className="p-3 bg-theme-subtle/50 border border-theme-border/50 rounded-lg hover:border-climbing-orange-500/30 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-theme-text group-hover:text-climbing-orange-400 transition-colors">
                  {route.routeName}
                </span>
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                  {route.grade}
                </span>
                <span className="text-xs text-theme-text-muted">{route.wallName}</span>
              </div>
              <ChevronRight size={14} className="text-theme-text-muted group-hover:text-climbing-orange-400 transition-colors" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center p-1.5 bg-theme-card rounded">
                <p className="text-theme-text-muted">尝试</p>
                <p className="font-semibold text-theme-text">{route.attemptCount}</p>
              </div>
              <div className="text-center p-1.5 bg-theme-card rounded">
                <p className="text-theme-text-muted">成功</p>
                <p className="font-semibold text-green-400">{route.successCount}</p>
              </div>
              <div className="text-center p-1.5 bg-theme-card rounded">
                <p className="text-theme-text-muted">脱落</p>
                <p className="font-semibold text-red-400">{route.fallCount}</p>
              </div>
              <div className="text-center p-1.5 bg-theme-card rounded">
                <p className="text-theme-text-muted">完成率</p>
                <p className={`font-semibold ${route.completionRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {route.completionRate}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RouteCompletionDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<RouteCompletionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupBy>('difficulty');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [drillDownRoutes, setDrillDownRoutes] = useState<CompletionGroupItem[] | null>(null);

  const gymId = user?.gymId;

  const fetchData = useCallback(async () => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await analyticsApi.getRouteCompletionAnalysis(gymId, {
        groupBy,
      });
      setData(result);
      setExpandedGroup(null);
      setDrillDownRoutes(null);
    } catch (err) {
      console.error('获取线路完成率数据失败:', err);
      setData({ groups: [], trend: [] });
    } finally {
      setLoading(false);
    }
  }, [gymId, groupBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.groups.map((g) => ({
      name: g.label,
      尝试次数: g.attemptCount,
      成功次数: g.successCount,
      脱落次数: g.fallCount,
      完成率: g.completionRate,
    }));
  }, [data]);

  const trendChartData = useMemo(() => {
    if (!data || data.trend.length === 0) return [];
    return data.trend.map((t) => ({
      name: t.period,
      尝试次数: t.attemptCount,
      成功次数: t.successCount,
      脱落次数: t.fallCount,
      完成率: t.completionRate,
    }));
  }, [data]);

  const summaryStats = useMemo(() => {
    if (!data || data.groups.length === 0) return null;
    const totalAttempts = data.groups.reduce((s, g) => s + g.attemptCount, 0);
    const totalSuccess = data.groups.reduce((s, g) => s + g.successCount, 0);
    const totalFall = data.groups.reduce((s, g) => s + g.fallCount, 0);
    const totalRate = totalAttempts > 0 ? Number(((totalSuccess / totalAttempts) * 100).toFixed(1)) : 0;
    const totalRoutes = data.groups.reduce((s, g) => s + g.routes.length, 0);
    return { totalAttempts, totalSuccess, totalFall, totalRate, totalRoutes };
  }, [data]);

  const handleGroupClick = (group: CompletionGroup) => {
    if (expandedGroup === group.key) {
      setExpandedGroup(null);
      setDrillDownRoutes(null);
    } else {
      setExpandedGroup(group.key);
      setDrillDownRoutes(null);
    }
  };

  const handleDrillDown = (routes: CompletionGroupItem[]) => {
    setDrillDownRoutes(routes);
  };

  if (!gymId) {
    return (
      <Card className="p-12 text-center">
        <Target size={48} className="mx-auto text-theme-text-muted mb-4" />
        <h3 className="text-lg font-medium text-theme-text mb-2">需要关联岩馆</h3>
        <p className="text-theme-text-muted">请联系管理员将您的账号关联到岩馆</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-climbing-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-theme-text">线路完成率分析</h1>
        <p className="text-theme-text-muted mt-1">按难度、岩壁角度和时间段分析线路完成情况</p>
      </div>

      {summaryStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4 hover:border-theme-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-climbing-orange-500/20">
                <Target size={20} className="text-climbing-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text">{summaryStats.totalRoutes}</p>
                <p className="text-xs text-theme-text-muted">分析线路数</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:border-theme-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <BarChart3 size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text">{summaryStats.totalAttempts}</p>
                <p className="text-xs text-theme-text-muted">总尝试次数</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:border-theme-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/20">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{summaryStats.totalSuccess}</p>
                <p className="text-xs text-theme-text-muted">总成功次数</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:border-theme-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20">
                <Flame size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{summaryStats.totalFall}</p>
                <p className="text-xs text-theme-text-muted">总脱落次数</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:border-theme-border transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20">
                <Target size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-theme-text">{summaryStats.totalRate}%</p>
                <p className="text-xs text-theme-text-muted">总完成率</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-theme-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-theme-text-muted" />
              <span className="text-sm text-theme-text-muted">分组方式</span>
              <div className="flex gap-1">
                {groupByOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGroupBy(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      groupBy === opt.value
                        ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                        : 'text-theme-text-secondary hover:text-theme-text hover:bg-theme-hover/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-text-muted">图表</span>
              <div className="flex gap-1 bg-theme-subtle rounded-lg p-0.5">
                {chartTypeOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setChartType(opt.value)}
                      className={`p-1.5 rounded-md transition-all ${
                        chartType === opt.value
                          ? 'bg-climbing-orange-500/20 text-climbing-orange-400'
                          : 'text-theme-text-muted hover:text-theme-text'
                      }`}
                      title={opt.label}
                    >
                      <Icon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="尝试次数" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="成功次数" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="脱落次数" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="尝试次数" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} />
                    <Line type="monotone" dataKey="成功次数" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E', r: 4 }} />
                    <Line type="monotone" dataKey="脱落次数" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-theme-text-muted">暂无数据</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text">完成率对比</h3>
            <p className="text-sm text-theme-text-muted mt-1">各分组完成率百分比</p>
          </div>
          <div className="p-5">
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }}
                      width={100}
                    />
                    <Tooltip content={<CustomTooltip />} formatter={(value: number) => [`${value}%`, '完成率']} />
                    <Bar dataKey="完成率" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={index} fill={barColors[index % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-theme-text-muted">暂无数据</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 border-b border-theme-border">
            <h3 className="text-lg font-semibold text-theme-text">趋势对比</h3>
            <p className="text-sm text-theme-text-muted mt-1">完成率与尝试次数随时间变化</p>
          </div>
          <div className="p-5">
            {trendChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      stroke="var(--color-border)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="尝试次数" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
                    <Area yAxisId="left" type="monotone" dataKey="成功次数" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="完成率" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-theme-text-muted">暂无趋势数据</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b border-theme-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-theme-text">分组详情</h3>
              <p className="text-sm text-theme-text-muted mt-1">点击分组展开查看线路明细和掉落热力图</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-theme-border">
          {data && data.groups.length > 0 ? (
            data.groups.map((group) => (
              <div key={group.key}>
                <button
                  onClick={() => handleGroupClick(group)}
                  className="w-full p-4 hover:bg-theme-hover/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedGroup === group.key ? (
                        <ChevronDown size={18} className="text-theme-text-muted" />
                      ) : (
                        <ChevronRight size={18} className="text-theme-text-muted" />
                      )}
                      <span className="text-sm font-medium text-theme-text">{group.label}</span>
                      <span className="text-xs text-theme-text-muted">({group.routes.length} 条线路)</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-400">{group.attemptCount}</p>
                        <p className="text-[10px] text-theme-text-muted">尝试</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-400">{group.successCount}</p>
                        <p className="text-[10px] text-theme-text-muted">成功</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-400">{group.fallCount}</p>
                        <p className="text-[10px] text-theme-text-muted">脱落</p>
                      </div>
                      <div className="text-center min-w-[60px]">
                        <div className="relative w-12 h-12 mx-auto">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
                              fill="none"
                              stroke="var(--color-border)"
                              strokeWidth="3"
                            />
                            <path
                              d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
                              fill="none"
                              stroke={group.completionRate >= 50 ? '#22C55E' : '#F59E0B'}
                              strokeWidth="3"
                              strokeDasharray={`${group.completionRate}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-theme-text">
                            {group.completionRate}%
                          </span>
                        </div>
                        <p className="text-[10px] text-theme-text-muted mt-0.5">完成率</p>
                      </div>
                    </div>
                  </div>
                </button>

                {expandedGroup === group.key && (
                  <div className="px-4 pb-4">
                    {drillDownRoutes ? (
                      <RouteDrillDown
                        routes={drillDownRoutes}
                        onBack={() => setDrillDownRoutes(null)}
                      />
                    ) : (
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div>
                          <FallPositionHeatmap routes={group.routes} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-theme-text">线路列表</span>
                            {group.routes.length > 3 && (
                              <button
                                onClick={() => handleDrillDown(group.routes)}
                                className="text-xs text-climbing-orange-400 hover:text-climbing-orange-500 flex items-center gap-1 transition-colors"
                              >
                                查看全部 <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                          {group.routes.slice(0, 3).map((route) => (
                            <div
                              key={route.routeId}
                              onClick={() => navigate(`/routes/${route.routeId}`)}
                              className="flex items-center justify-between p-2.5 bg-theme-subtle/50 rounded-lg hover:bg-theme-hover/50 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-blue-400 px-1.5 py-0.5 bg-blue-500/20 rounded">
                                  {route.grade}
                                </span>
                                <span className="text-sm text-theme-text">{route.routeName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-theme-text-muted">
                                  {route.successCount}/{route.attemptCount}
                                </span>
                                <span className={`font-medium ${route.completionRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {route.completionRate}%
                                </span>
                              </div>
                            </div>
                          ))}
                          {group.routes.length === 0 && (
                            <p className="text-sm text-theme-text-muted text-center py-4">暂无线路数据</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Target size={32} className="mx-auto text-theme-text-muted mb-3" />
              <p className="text-theme-text-muted">暂无分析数据</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
