import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mountain,
  Search,
  Filter,
  Palette,
  User,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  CheckCheck,
  X,
  ListChecks,
  Loader2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Layers,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { routeApi, wallApi, userApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';
import { useAuthStore } from '@/store/auth';
import { useMessage } from '@/hooks/useMessage';
import type {
  Route as RouteType,
  RouteStatus,
  BatchStatusPreviewResult,
  BatchStatusResult,
} from '@/types';
import { getGradeFullClass, getGradeLabel } from '@/lib/utils';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const routeStatusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  removed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  drafting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  removing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const routeStatusLabels: Record<string, string> = {
  open: '开放中',
  removed: '已拆除',
  drafting: '定线中',
  removing: '拆除中',
};

const archivedBadge = 'bg-purple-500/20 text-purple-400 border border-purple-500/30';

const colorOptions = [
  { value: 'all', label: '全部颜色', color: '' },
  { value: '#FF6B35', label: '橙色', color: '#FF6B35' },
  { value: '#22C55E', label: '绿色', color: '#22C55E' },
  { value: '#3B82F6', label: '蓝色', color: '#3B82F6' },
  { value: '#A855F7', label: '紫色', color: '#A855F7' },
  { value: '#EF4444', label: '红色', color: '#EF4444' },
  { value: '#F59E0B', label: '黄色', color: '#F59E0B' },
  { value: '#EC4899', label: '粉色', color: '#EC4899' },
  { value: '#06B6D4', label: '青色', color: '#06B6D4' },
];

const statusOptions: { value: RouteStatus; label: string }[] = [
  { value: 'drafting', label: '定线中' },
  { value: 'open', label: '开放中' },
  { value: 'removing', label: '拆除中' },
  { value: 'removed', label: '已拆除' },
];

const pageSize = 8;

export default function RouteManagement() {
  const navigate = useNavigate();
  const { currentGym } = useGymStore();
  const { user: authUser } = useAuthStore();
  const { success: msgSuccess, error: msgError } = useMessage();

  const canManage =
    authUser?.role === 'platform_admin' ||
    authUser?.role === 'gym_admin' ||
    authUser?.role === 'setter';

  const [routes, setRoutes] = useState<RouteType[]>([]);
  const [walls, setWalls] = useState<{ id: number; name: string }[]>([]);
  const [gymUsers, setGymUsers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterColor, setFilterColor] = useState('all');
  const [filterWallId, setFilterWallId] = useState<number | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<RouteStatus>('open');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<BatchStatusPreviewResult | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultData, setResultData] = useState<BatchStatusResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const fetchRoutes = useCallback(async () => {
    if (!currentGym) return;
    setLoading(true);
    try {
      const wallsData = await wallApi.getWalls(currentGym.id);
      setWalls(wallsData.map((w) => ({ id: w.id, name: w.name })));
      const routesByWall = await Promise.all(
        wallsData.map((wall) =>
          routeApi.getRoutes(
            wall.id,
            includeArchived ? { includeArchived: true } : undefined,
          ),
        ),
      );
      setRoutes(routesByWall.flat());
    } catch (err) {
      console.error('Failed to fetch routes:', err);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [currentGym, includeArchived]);

  const fetchUsers = useCallback(async () => {
    if (!currentGym) return;
    try {
      const data = await userApi.getGymUsers(currentGym.id);
      setGymUsers(data.map((u) => ({ id: u.id, name: u.name })));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [currentGym]);

  useEffect(() => {
    if (canManage) {
      fetchRoutes();
      fetchUsers();
    }
  }, [canManage, fetchRoutes, fetchUsers]);

  const filteredRoutes = useMemo(() => {
    let result = routes;
    if (filterType !== 'all') result = result.filter((r) => r.type === filterType);
    if (filterStatus !== 'all') result = result.filter((r) => r.status === filterStatus);
    if (filterWallId !== '') result = result.filter((r) => r.wallId === filterWallId);
    if (filterColor !== 'all') result = result.filter((r) => r.color === filterColor);
    if (filterGrade !== 'all') {
      result = result.filter((r) => {
        const match = r.grade?.match(/V(\d+)/);
        const gradeNum = match ? parseInt(match[1], 10) : -1;
        if (filterGrade === 'V0') return gradeNum >= 0 && gradeNum <= 2;
        if (filterGrade === 'V3') return gradeNum >= 3 && gradeNum <= 5;
        if (filterGrade === 'V6') return gradeNum >= 6;
        return r.grade === filterGrade;
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.setterName?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [routes, filterType, filterStatus, filterWallId, filterColor, filterGrade, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRoutes = filteredRoutes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const getWallName = (wallId: number) =>
    walls.find((w) => w.id === wallId)?.name || '未知岩壁';

  const getSetterName = (setterId?: number) => {
    if (!setterId) return '未知';
    return (
      gymUsers.find((u) => u.id === setterId)?.name ||
      routes.find((r) => r.setterId === setterId)?.setterName ||
      `用户 #${setterId}`
    );
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const toggleRoute = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePageSelection = () => {
    const pageIds = paginatedRoutes.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredRoutes.map((r) => r.id)));
    msgSuccess(`已跨页全选 ${filteredRoutes.length} 条筛选结果`);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pageAllSelected =
    paginatedRoutes.length > 0 &&
    paginatedRoutes.every((r) => selectedIds.has(r.id));
  const pageSomeSelected =
    paginatedRoutes.some((r) => selectedIds.has(r.id)) && !pageAllSelected;

  const handleOpenBatch = () => {
    if (selectedIds.size === 0) {
      msgError('请先选择需要批量操作的线路');
      return;
    }
    setTargetStatus('open');
    setPreviewResult(null);
    setIsBatchModalOpen(true);
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const result = await routeApi.batchStatusPreview({
        status: targetStatus,
        routeIds: Array.from(selectedIds),
        includeArchived,
      });
      setPreviewResult(result);
      setIsBatchModalOpen(false);
      setIsConfirmModalOpen(true);
    } catch (err) {
      const reason = (err as { message?: string })?.message || '预览失败，请稍后重试';
      msgError(reason);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      const result = await routeApi.batchUpdateStatus({
        status: targetStatus,
        routeIds: Array.from(selectedIds),
        includeArchived,
      });
      setResultData(result);
      setIsConfirmModalOpen(false);
      setIsResultModalOpen(true);

      if (result.success) {
        msgSuccess(`批量状态变更完成，成功更新 ${result.successCount} 条`);
      } else if (result.failureCount > 0) {
        msgError(`部分失败已回滚，共 ${result.failureCount} 条失败`);
      }

      fetchRoutes();
    } catch (err) {
      const reason = (err as { message?: string })?.message || '批量操作失败，请稍后重试';
      msgError(reason);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterGrade('all');
    setFilterStatus('all');
    setFilterColor('all');
    setFilterWallId('');
    setPage(1);
  };

  if (!canManage) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-theme-text-muted mb-4" />
        <h3 className="text-lg font-medium text-theme-text mb-2">无权限访问</h3>
        <p className="text-theme-text-muted mb-4">仅管理员或定线员可管理线路</p>
        <Button onClick={() => navigate('/routes')}>返回线路列表</Button>
      </Card>
    );
  }

  const previewWillChange = previewResult
    ? previewResult.routes.filter((r) => r.status !== targetStatus && !r.isArchived).length
    : 0;
  const previewAlreadyTarget = previewResult
    ? previewResult.routes.filter((r) => r.status === targetStatus).length
    : 0;
  const previewArchived = previewResult
    ? previewResult.routes.filter((r) => r.isArchived).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text flex items-center gap-3">
            <Layers size={24} className="text-climbing-orange-400" />
            线路管理
          </h1>
          <p className="text-theme-text-muted mt-1">批量管理线路状态，支持跨页全选与按条件筛选后批量标记</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-theme-text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => {
              setIncludeArchived(e.target.checked);
              setPage(1);
            }}
            className="w-4 h-4 rounded border-theme-border bg-theme-subtle text-climbing-orange-500 focus:ring-climbing-orange-500"
          />
          包含已归档线路
        </label>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
              <input
                type="text"
                placeholder="搜索线路名称、定线员..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-theme-subtle border border-theme-border rounded-lg text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-climbing-orange-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-theme-text-muted" />
              <select
                value={filterWallId}
                onChange={(e) => {
                  setFilterWallId(e.target.value ? Number(e.target.value) : '');
                  setPage(1);
                }}
                className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="">全部岩壁</option>
                {walls.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              <option value="all">全部类型</option>
              <option value="boulder">抱石</option>
              <option value="lead">先锋</option>
              <option value="top_rope">顶绳</option>
              <option value="speed">速度</option>
            </select>
            <select
              value={filterGrade}
              onChange={(e) => {
                setFilterGrade(e.target.value);
                setPage(1);
              }}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              <option value="all">全部定级</option>
              <option value="V0">初级 (V0-V2)</option>
              <option value="V3">中级 (V3-V5)</option>
              <option value="V6">高级 (V6+)</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              <option value="all">全部状态</option>
              <option value="open">开放中</option>
              <option value="drafting">定线中</option>
              <option value="removing">拆除中</option>
              <option value="removed">已拆除</option>
            </select>
            <div className="flex items-center gap-2">
              <Palette size={16} className="text-theme-text-muted" />
              <select
                value={filterColor}
                onChange={(e) => {
                  setFilterColor(e.target.value);
                  setPage(1);
                }}
                className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              清除筛选
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 border-b border-theme-border bg-theme-card/40">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-theme-text-secondary">
              共 <span className="text-theme-text font-medium">{filteredRoutes.length}</span> 条
            </span>
            {selectedIds.size > 0 && (
              <span className="flex items-center gap-1 text-climbing-orange-400">
                <CheckCheck size={14} />
                已选 {selectedIds.size} 条
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={selectAllFiltered} disabled={filteredRoutes.length === 0}>
              <CheckSquare size={14} className="mr-1" />
              跨页全选筛选结果
            </Button>
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X size={14} className="mr-1" />
                清除选择
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenBatch}
              disabled={selectedIds.size === 0}
            >
              <ListChecks size={14} className="mr-1" />
              批量修改状态
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-card/50">
              <tr>
                <th className="px-5 py-3 w-10">
                  <button
                    type="button"
                    onClick={togglePageSelection}
                    className="flex items-center justify-center text-theme-text-secondary hover:text-theme-text transition-colors"
                    title={pageAllSelected ? '取消本页全选' : '全选本页'}
                  >
                    {pageAllSelected ? (
                      <CheckSquare size={18} className="text-climbing-orange-400" />
                    ) : pageSomeSelected ? (
                      <CheckSquare size={18} className="text-climbing-orange-400/60" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">线路</th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">类型</th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">状态</th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">岩壁</th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">定线员</th>
                <th className="text-left px-3 py-3 text-sm font-medium text-theme-text-secondary">创建时间</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-theme-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-theme-text-muted">
                    加载中...
                  </td>
                </tr>
              ) : paginatedRoutes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Mountain size={48} className="mx-auto text-theme-text-muted mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">暂无线路</h3>
                    <p className="text-theme-text-muted">没有找到符合条件的线路</p>
                  </td>
                </tr>
              ) : (
                paginatedRoutes.map((route) => {
                  const isSelected = selectedIds.has(route.id);
                  return (
                    <tr
                      key={route.id}
                      className={`hover:bg-theme-card/30 transition-colors ${isSelected ? 'bg-climbing-orange-500/5' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => toggleRoute(route.id)}
                          className="flex items-center justify-center text-theme-text-secondary hover:text-theme-text transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-climbing-orange-400" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1.5 h-10 rounded-full flex-shrink-0"
                            style={{ backgroundColor: route.color || '#475569' }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-theme-text truncate">{route.name}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${getGradeFullClass(route.grade)}`}>
                              {route.grade} · {getGradeLabel(route.grade)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs border border-blue-500/30">
                          {routeTypeLabels[route.type]}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-xs border ${routeStatusColors[route.status]}`}>
                            {routeStatusLabels[route.status]}
                          </span>
                          {route.isArchived && (
                            <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded text-xs border ${archivedBadge}`}>
                              已归档
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-theme-text-secondary">{getWallName(route.wallId)}</td>
                      <td className="px-3 py-4 text-sm text-theme-text-secondary flex items-center gap-1">
                        <User size={12} className="text-theme-text-muted" />
                        {getSetterName(route.setterId)}
                      </td>
                      <td className="px-3 py-4 text-sm text-theme-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(route.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/routes/${route.id}`}
                          className="text-xs text-climbing-orange-400 hover:text-climbing-orange-300"
                        >
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-theme-border">
            <span className="text-sm text-theme-text-muted">
              共 {filteredRoutes.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === currentPage ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(p)}
                    className="w-8 h-8 p-0"
                  >
                    {p}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="批量修改状态"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-theme-text-secondary">
            当前已选择 <span className="text-climbing-orange-400 font-medium">{selectedIds.size}</span> 条线路，请选择目标状态：
          </p>
          <div className="grid grid-cols-2 gap-3">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTargetStatus(opt.value)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  targetStatus === opt.value
                    ? 'border-climbing-orange-500 bg-climbing-orange-500/10 text-climbing-orange-400'
                    : 'border-theme-border bg-theme-subtle text-theme-text-secondary hover:border-theme-border'
                }`}
              >
                <span className={`w-2 h-2 rounded-full border ${routeStatusColors[opt.value].split(' ').slice(0, 2).join(' ')}`} />
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBatchModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handlePreview} isLoading={isPreviewLoading} disabled={isPreviewLoading}>
              {isPreviewLoading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  正在生成影响清单...
                </>
              ) : (
                '下一步：查看影响清单'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isExecuting && setIsConfirmModalOpen(false)}
        title="操作影响清单与二次确认"
        size="xl"
      >
        <div className="space-y-4">
          <div className="p-4 bg-climbing-orange-500/10 border border-climbing-orange-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-climbing-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-climbing-orange-400">即将批量变更线路状态</p>
                <p className="text-theme-text-secondary mt-1">
                  目标状态：
                  <span className={`ml-1 px-2 py-0.5 rounded text-xs border ${routeStatusColors[targetStatus]}`}>
                    {routeStatusLabels[targetStatus]}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-theme-subtle rounded-lg text-center">
              <p className="text-2xl font-bold text-theme-text">{previewResult?.total ?? 0}</p>
              <p className="text-xs text-theme-text-muted mt-1">影响线路总数</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">{previewWillChange}</p>
              <p className="text-xs text-theme-text-muted mt-1">将变更状态</p>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-400">{previewAlreadyTarget}</p>
              <p className="text-xs text-theme-text-muted mt-1">已是目标状态</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-400">{previewArchived}</p>
              <p className="text-xs text-theme-text-muted mt-1">已归档(将失败)</p>
            </div>
          </div>

          {previewArchived > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-sm text-red-400">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>检测到 {previewArchived} 条已归档线路，执行后将因归档线路不可修改状态而导致整批回滚，请先在筛选中排除已归档线路。</span>
            </div>
          )}

          <div className="border border-theme-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-theme-card/50 text-xs text-theme-text-secondary flex items-center justify-between">
              <span>影响清单明细</span>
              <span>共 {previewResult?.routes.length ?? 0} 条</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-theme-subtle sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">线路</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩壁</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">当前状态</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">变更后</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {previewResult?.routes.map((r) => (
                    <tr key={r.id} className="hover:bg-theme-card/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color || '#475569' }} />
                          <span className="text-theme-text">{r.name}</span>
                          <span className="text-xs text-theme-text-muted">{r.grade}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-theme-text-secondary">{r.wallName}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs border ${routeStatusColors[r.status]}`}>
                          {routeStatusLabels[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {r.isArchived ? (
                          <span className="text-xs text-red-400">归档·跳过</span>
                        ) : r.status === targetStatus ? (
                          <span className="text-xs text-gray-400">无变化</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs border ${routeStatusColors[targetStatus]}`}>
                            {routeStatusLabels[targetStatus]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-theme-subtle rounded-lg flex items-start gap-2 text-xs text-theme-text-secondary">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-theme-text-muted" />
            <span>二次确认：执行后将进入事务处理，若部分失败将回滚已处理项并返回失败明细，操作过程将记录到操作日志。</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)} disabled={isExecuting}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleExecute}
              isLoading={isExecuting}
              disabled={isExecuting || previewWillChange === 0}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  正在执行...
                </>
              ) : (
                '确认执行批量变更'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResultModalOpen}
        onClose={() => {
          setIsResultModalOpen(false);
          setResultData(null);
          clearSelection();
        }}
        title="批量操作结果"
        size="lg"
        showCloseButton={!isExecuting}
      >
        <div className="space-y-4">
          {resultData?.success ? (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-400">批量状态变更成功</p>
                <p className="text-theme-text-secondary mt-1">
                  共处理 {resultData.total} 条，成功更新 {resultData.successCount} 条，数据已异步刷新。
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-400">批量操作部分失败，已回滚已处理项</p>
                  <p className="text-theme-text-secondary mt-1">
                    共 {resultData?.total ?? 0} 条，失败 {resultData?.failureCount ?? 0} 条。为保证数据一致性，本次所有变更均已回滚，列表已异步刷新。
                  </p>
                </div>
              </div>

              {resultData && resultData.failures.length > 0 && (
                <div className="border border-theme-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-theme-card/50 text-xs text-theme-text-secondary flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    失败明细
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-theme-subtle sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-theme-text-muted font-medium">线路</th>
                          <th className="text-left px-4 py-2 text-theme-text-muted font-medium">失败原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border/50">
                        {resultData.failures.map((f, idx) => (
                          <tr key={`${f.routeId}-${idx}`} className="hover:bg-theme-card/30">
                            <td className="px-4 py-2 text-theme-text">
                              {f.routeName}
                              {f.routeId > 0 && (
                                <span className="text-xs text-theme-text-muted ml-1">#{f.routeId}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-red-400">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setIsResultModalOpen(false);
                setResultData(null);
                clearSelection();
              }}
            >
              <RotateCcw size={16} className="mr-2" />
              完成
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
