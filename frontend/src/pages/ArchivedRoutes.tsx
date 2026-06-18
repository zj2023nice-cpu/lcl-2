import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Search,
  Filter,
  RotateCcw,
  User,
  Calendar,
  Mountain,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { routeApi, wallApi, userApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';
import { useAuthStore } from '@/store/auth';
import { useMessage } from '@/hooks/useMessage';
import type { Route as RouteType } from '@/types';
import { useNavigate } from 'react-router-dom';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

export default function ArchivedRoutes() {
  const navigate = useNavigate();
  const { currentGym } = useGymStore();
  const { user } = useAuthStore();
  const { success, error } = useMessage();
  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterArchivedBy, setFilterArchivedBy] = useState<number | ''>('');
  const [filterWallId, setFilterWallId] = useState<number | ''>('');
  const [walls, setWalls] = useState<{ id: number; name: string }[]>([]);
  const [gymUsers, setGymUsers] = useState<{ id: number; name: string }[]>([]);
  const [restoreRoute, setRestoreRoute] = useState<RouteType | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const canViewArchived = user?.role === 'platform_admin' || user?.role === 'gym_admin';

  useEffect(() => {
    const fetchWalls = async () => {
      if (currentGym) {
        try {
          const data = await wallApi.getWalls(currentGym.id);
          setWalls(data.map(w => ({ id: w.id, name: w.name })));
        } catch (err) {
          console.error('Failed to fetch walls:', err);
        }
      }
    };
    const fetchUsers = async () => {
      if (currentGym) {
        try {
          const data = await userApi.getGymUsers(currentGym.id);
          setGymUsers(data.map(u => ({ id: u.id, name: u.name })));
        } catch (err) {
          console.error('Failed to fetch users:', err);
        }
      }
    };
    if (canViewArchived) {
      fetchWalls();
      fetchUsers();
    }
  }, [currentGym, canViewArchived]);

  useEffect(() => {
    const fetchArchivedRoutes = async () => {
      if (!canViewArchived) return;
      setIsLoading(true);
      try {
        const filters: { reason?: string; startDate?: string; endDate?: string; archivedBy?: number; wallId?: number } = {};
        if (filterReason.trim()) filters.reason = filterReason.trim();
        if (filterStartDate) filters.startDate = filterStartDate;
        if (filterEndDate) filters.endDate = filterEndDate;
        if (filterArchivedBy !== '') filters.archivedBy = filterArchivedBy;
        if (filterWallId !== '') filters.wallId = filterWallId;
        const data = await routeApi.getArchivedRoutes(filters);
        let filtered = data;
        if (searchQuery) {
          filtered = filtered.filter(
            r =>
              r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (r.archiveReason && r.archiveReason.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }
        setRoutes(filtered);
      } catch (err) {
        console.error('Failed to fetch archived routes:', err);
        setRoutes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchivedRoutes();
  }, [canViewArchived, filterReason, filterStartDate, filterEndDate, filterArchivedBy, filterWallId, searchQuery]);

  const getWallName = (wallId: number) => {
    return walls.find(w => w.id === wallId)?.name || '未知岩壁';
  };

  const getUserName = (userId?: number | null) => {
    if (!userId) return '未知';
    return gymUsers.find(u => u.id === userId)?.name || `用户 #${userId}`;
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterReason('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterArchivedBy('');
    setFilterWallId('');
  };

  const handleRestore = async () => {
    if (!restoreRoute) return;
    setIsRestoring(true);
    try {
      await routeApi.restoreRoute(restoreRoute.id);
      setRoutes(prev => prev.filter(r => r.id !== restoreRoute.id));
      setIsRestoreConfirmOpen(false);
      setRestoreRoute(null);
      success('线路已恢复');
    } catch (err) {
      const reason = (err as { message?: string })?.message || '恢复失败，请稍后重试';
      error(reason);
    } finally {
      setIsRestoring(false);
    }
  };

  if (!canViewArchived) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-rock-light-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">无权限访问</h3>
        <p className="text-rock-light-500 mb-4">仅管理员可查看归档线路</p>
        <Button onClick={() => navigate('/routes')}>返回线路列表</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Archive size={24} className="text-purple-400" />
            归档线路管理
          </h1>
          <p className="text-rock-light-500 mt-1">管理已归档的线路，支持筛选和恢复</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-rock-light-500" />
              <input
                type="text"
                placeholder="搜索线路名称、归档原因..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-rock-dark-900 border border-rock-dark-700 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-rock-light-500" />
              <select
                value={filterWallId}
                onChange={(e) => setFilterWallId(e.target.value ? Number(e.target.value) : '')}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="">全部岩壁</option>
                {walls.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} className="text-rock-light-500" />
              <select
                value={filterArchivedBy}
                onChange={(e) => setFilterArchivedBy(e.target.value ? Number(e.target.value) : '')}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="">全部操作人</option>
                {gymUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-rock-light-500" />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
                placeholder="开始日期"
              />
              <span className="text-rock-light-500">至</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-rock-dark-900 border border-rock-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
                placeholder="结束日期"
              />
            </div>
            <Button variant="ghost" onClick={handleClearFilters}>
              清除筛选
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-5 bg-rock-dark-700 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-rock-dark-700 rounded w-1/2" />
                <div className="h-4 bg-rock-dark-700 rounded w-2/3" />
                <div className="h-4 bg-rock-dark-700 rounded w-1/4" />
              </div>
            </Card>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive size={48} className="mx-auto text-rock-light-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">暂无归档线路</h3>
          <p className="text-rock-light-500">没有找到符合筛选条件的归档线路</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map((route) => (
            <Card key={route.id} className="overflow-hidden hover:border-rock-dark-600 transition-colors">
              <div className="flex flex-col md:flex-row">
                <div
                  className="w-full md:w-2 md:h-auto h-2 flex-shrink-0"
                  style={{ backgroundColor: route.color }}
                />
                <div className="flex-1 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white text-lg">{route.name}</h3>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs border border-purple-500/30">
                          已归档
                        </span>
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs border border-blue-500/30">
                          {routeTypeLabels[route.type]}
                        </span>
                        <span className="px-2 py-0.5 bg-rock-dark-700 rounded text-xs font-bold text-climbing-orange-400">
                          {route.grade}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="p-3 bg-rock-dark-900 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Archive size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-rock-light-500 text-xs mb-1">归档原因</p>
                              <p className="text-white">{route.archiveReason || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                          <div className="flex items-center gap-2 text-rock-light-400">
                            <Mountain size={14} />
                            <span>{getWallName(route.wallId)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-rock-light-400">
                            <User size={14} />
                            <span>归档人：{getUserName(route.archivedBy)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-rock-light-400">
                            <Calendar size={14} />
                            <span>归档时间：{formatDateTime(route.archivedAt)}</span>
                          </div>
                          {route.restoredAt && (
                            <div className="flex items-center gap-2 text-green-400">
                              <RotateCcw size={14} />
                              <span>恢复时间：{formatDateTime(route.restoredAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        to={`/routes/${route.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-rock-dark-700 hover:bg-rock-dark-600 text-white text-sm rounded-lg transition-colors"
                      >
                        查看详情
                        <ChevronRight size={16} />
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setRestoreRoute(route);
                          setIsRestoreConfirmOpen(true);
                        }}
                      >
                        <RotateCcw size={16} className="mr-1" />
                        恢复
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-2 text-center">
        <span className="text-sm text-rock-light-500">
          共 {routes.length} 条归档线路
        </span>
      </div>

      <Modal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        title="恢复线路"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <RotateCcw size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-400">恢复确认</p>
                <p className="text-sm text-green-400/80 mt-1">
                  恢复后该线路将重新在前台可见，所有关联数据将继续可用。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-rock-dark-900 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-rock-light-500">线路名称</span>
              <span className="text-white font-medium">{restoreRoute?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rock-light-500">线路定级</span>
              <span className="text-white font-medium">{restoreRoute?.grade}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-rock-light-500">归档原因</span>
              <span className="text-white text-right max-w-[60%]">{restoreRoute?.archiveReason}</span>
            </div>
            {restoreRoute?.archivedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-rock-light-500">归档时间</span>
                <span className="text-white">{formatDateTime(restoreRoute.archivedAt)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsRestoreConfirmOpen(false)}
              disabled={isRestoring}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleRestore}
              disabled={isRestoring}
              isLoading={isRestoring}
            >
              <RotateCcw size={16} className="mr-2" />
              确认恢复
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
