import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  PlusCircle,
  Trash2,
  Eye,
  ArrowLeftRight,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';

type OperationType = 'create' | 'update' | 'delete' | 'view';

interface OperationLog {
  id: number;
  operator: string;
  operatorRole: string;
  operationTime: string;
  operationType: OperationType;
  targetType: string;
  targetName: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  changes?: { field: string; before: string; after: string }[];
}

const operationTypeLabels: Record<OperationType, string> = {
  create: '创建',
  update: '修改',
  delete: '删除',
  view: '查看',
};

const operationTypeColors: Record<OperationType, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  view: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const operationTypeIcons: Record<OperationType, typeof PlusCircle> = {
  create: PlusCircle,
  update: Edit3,
  delete: Trash2,
  view: Eye,
};

const targetTypeOptions = [
  { value: 'all', label: '全部对象' },
  { value: 'user', label: '用户' },
  { value: 'route', label: '线路' },
  { value: 'wall', label: '岩壁' },
  { value: 'ascent', label: '攀爬记录' },
  { value: 'gym', label: '岩馆' },
];

const operationTypeOptions = [
  { value: 'all', label: '全部操作' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'view', label: '查看' },
];

const mockLogs: OperationLog[] = [
  {
    id: 1,
    operator: '张三',
    operatorRole: '岩馆管理员',
    operationTime: '2024-01-15 14:30:25',
    operationType: 'create',
    targetType: 'route',
    targetName: '动力线 V3',
    afterData: { name: '动力线 V3', grade: 'V3', type: 'boulder', color: '红色' },
    changes: [
      { field: '名称', before: '-', after: '动力线 V3' },
      { field: '难度', before: '-', after: 'V3' },
      { field: '类型', before: '-', after: '抱石' },
      { field: '颜色', before: '-', after: '红色' },
    ],
  },
  {
    id: 2,
    operator: '李四',
    operatorRole: '定线员',
    operationTime: '2024-01-15 13:15:42',
    operationType: 'update',
    targetType: 'route',
    targetName: '屋檐线 V5',
    beforeData: { name: '屋檐线 V5', grade: 'V4', status: 'open' },
    afterData: { name: '屋檐线 V5', grade: 'V5', status: 'open' },
    changes: [
      { field: '难度', before: 'V4', after: 'V5' },
    ],
  },
  {
    id: 3,
    operator: '王五',
    operatorRole: '平台管理员',
    operationTime: '2024-01-15 10:05:18',
    operationType: 'update',
    targetType: 'user',
    targetName: '赵六',
    beforeData: { name: '赵六', role: 'guest', verifyStatus: 'pending' },
    afterData: { name: '赵六', role: 'verified_climber', verifyStatus: 'approved' },
    changes: [
      { field: '角色', before: '游客', after: '认证攀岩者' },
      { field: '认证状态', before: '待审核', after: '已认证' },
    ],
  },
  {
    id: 4,
    operator: '张三',
    operatorRole: '岩馆管理员',
    operationTime: '2024-01-14 16:45:33',
    operationType: 'delete',
    targetType: 'route',
    targetName: '测试线 V2',
    beforeData: { name: '测试线 V2', grade: 'V2', type: 'boulder' },
    changes: [
      { field: '状态', before: '已开放', after: '已删除' },
    ],
  },
  {
    id: 5,
    operator: '李四',
    operatorRole: '定线员',
    operationTime: '2024-01-14 11:20:56',
    operationType: 'create',
    targetType: 'wall',
    targetName: '训练墙 B',
    afterData: { name: '训练墙 B', areaSqm: 50, description: '训练用岩壁' },
    changes: [
      { field: '名称', before: '-', after: '训练墙 B' },
      { field: '面积', before: '-', after: '50 平方米' },
      { field: '描述', before: '-', after: '训练用岩壁' },
    ],
  },
  {
    id: 6,
    operator: '赵六',
    operatorRole: '认证攀岩者',
    operationTime: '2024-01-14 09:30:10',
    operationType: 'create',
    targetType: 'ascent',
    targetName: '动力线 V3 - Flash',
    afterData: { route: '动力线 V3', type: 'flash', attempts: 1 },
    changes: [
      { field: '线路', before: '-', after: '动力线 V3' },
      { field: '攀爬类型', before: '-', after: 'Flash' },
      { field: '尝试次数', before: '-', after: '1 次' },
    ],
  },
  {
    id: 7,
    operator: '王五',
    operatorRole: '平台管理员',
    operationTime: '2024-01-13 15:00:00',
    operationType: 'update',
    targetType: 'gym',
    targetName: '先锋攀岩馆',
    beforeData: { name: '先锋攀岩馆', address: '朝阳区xxx', areaSqm: 200 },
    afterData: { name: '先锋攀岩馆', address: '朝阳区xxx路88号', areaSqm: 250 },
    changes: [
      { field: '地址', before: '朝阳区xxx', after: '朝阳区xxx路88号' },
      { field: '面积', before: '200 平方米', after: '250 平方米' },
    ],
  },
  {
    id: 8,
    operator: '张三',
    operatorRole: '岩馆管理员',
    operationTime: '2024-01-13 10:30:45',
    operationType: 'view',
    targetType: 'user',
    targetName: '用户列表',
    changes: [],
  },
  {
    id: 9,
    operator: '李四',
    operatorRole: '定线员',
    operationTime: '2024-01-12 17:25:30',
    operationType: 'update',
    targetType: 'route',
    targetName: '大斜面 V6',
    beforeData: { name: '大斜面 V6', status: 'drafting' },
    afterData: { name: '大斜面 V6', status: 'open' },
    changes: [
      { field: '状态', before: '草稿', after: '已开放' },
    ],
  },
  {
    id: 10,
    operator: '王五',
    operatorRole: '平台管理员',
    operationTime: '2024-01-12 14:10:20',
    operationType: 'create',
    targetType: 'user',
    targetName: '钱七',
    afterData: { name: '钱七', email: 'qianqi@example.com', role: 'gym_admin' },
    changes: [
      { field: '姓名', before: '-', after: '钱七' },
      { field: '邮箱', before: '-', after: 'qianqi@example.com' },
      { field: '角色', before: '-', after: '岩馆管理员' },
    ],
  },
  {
    id: 11,
    operator: '赵六',
    operatorRole: '认证攀岩者',
    operationTime: '2024-01-12 08:45:00',
    operationType: 'view',
    targetType: 'route',
    targetName: '线路详情',
    changes: [],
  },
  {
    id: 12,
    operator: '张三',
    operatorRole: '岩馆管理员',
    operationTime: '2024-01-11 16:20:15',
    operationType: 'delete',
    targetType: 'wall',
    targetName: '旧训练墙',
    beforeData: { name: '旧训练墙', areaSqm: 30 },
    changes: [
      { field: '状态', before: '正常', after: '已删除' },
    ],
  },
  {
    id: 13,
    operator: '李四',
    operatorRole: '定线员',
    operationTime: '2024-01-11 11:55:40',
    operationType: 'update',
    targetType: 'route',
    targetName: '平衡线 V2',
    beforeData: { name: '平衡线 V2', description: '' },
    afterData: { name: '平衡线 V2', description: '适合初学者的平衡训练线路' },
    changes: [
      { field: '描述', before: '(空)', after: '适合初学者的平衡训练线路' },
    ],
  },
  {
    id: 14,
    operator: '王五',
    operatorRole: '平台管理员',
    operationTime: '2024-01-10 13:40:25',
    operationType: 'update',
    targetType: 'user',
    targetName: '孙八',
    beforeData: { name: '孙八', role: 'gym_admin' },
    afterData: { name: '孙八', role: 'platform_admin' },
    changes: [
      { field: '角色', before: '岩馆管理员', after: '平台管理员' },
    ],
  },
  {
    id: 15,
    operator: '张三',
    operatorRole: '岩馆管理员',
    operationTime: '2024-01-10 09:15:50',
    operationType: 'create',
    targetType: 'route',
    targetName: '耐力线 V1',
    afterData: { name: '耐力线 V1', grade: 'V1', type: 'lead', color: '黄色' },
    changes: [
      { field: '名称', before: '-', after: '耐力线 V1' },
      { field: '难度', before: '-', after: 'V1' },
      { field: '类型', before: '-', after: '先锋' },
      { field: '颜色', before: '-', after: '黄色' },
    ],
  },
];

export default function OperationLogs() {
  const [operationType, setOperationType] = useState('all');
  const [targetType, setTargetType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const pageSize = 8;

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      if (operationType !== 'all' && log.operationType !== operationType) return false;
      if (targetType !== 'all' && log.targetType !== targetType) return false;

      if (startDate) {
        const logDate = new Date(log.operationTime.split(' ')[0]);
        const start = new Date(startDate);
        if (logDate < start) return false;
      }
      if (endDate) {
        const logDate = new Date(log.operationTime.split(' ')[0]);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }

      return true;
    });
  }, [operationType, targetType, startDate, endDate]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    return {
      total: mockLogs.length,
      create: mockLogs.filter((l) => l.operationType === 'create').length,
      update: mockLogs.filter((l) => l.operationType === 'update').length,
      delete: mockLogs.filter((l) => l.operationType === 'delete').length,
    };
  }, []);

  const handleTypeFilterChange = (type: string) => {
    setOperationType(type);
    setPage(1);
  };

  const handleTargetFilterChange = (type: string) => {
    setTargetType(type);
    setPage(1);
  };

  const handleDateChange = () => {
    setPage(1);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text">操作日志</h1>
          <p className="text-theme-text-muted mt-1">查看系统所有操作记录和变更详情</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-theme-text">{stats.total}</p>
              <p className="text-sm text-theme-text-muted mt-1">总操作数</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <FileText size={24} className="text-blue-400" />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-colors ${
            operationType === 'create' ? 'border-green-500/50' : ''
          }`}
          onClick={() => handleTypeFilterChange(operationType === 'create' ? 'all' : 'create')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-400">{stats.create}</p>
              <p className="text-sm text-theme-text-muted mt-1">创建操作</p>
            </div>
            <div className="p-3 rounded-xl bg-green-500/20">
              <PlusCircle size={24} className="text-green-400" />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-colors ${
            operationType === 'update' ? 'border-blue-500/50' : ''
          }`}
          onClick={() => handleTypeFilterChange(operationType === 'update' ? 'all' : 'update')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-400">{stats.update}</p>
              <p className="text-sm text-theme-text-muted mt-1">修改操作</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Edit3 size={24} className="text-blue-400" />
            </div>
          </div>
        </Card>
        <Card
          className={`p-5 cursor-pointer transition-colors ${
            operationType === 'delete' ? 'border-red-500/50' : ''
          }`}
          onClick={() => handleTypeFilterChange(operationType === 'delete' ? 'all' : 'delete')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-red-400">{stats.delete}</p>
              <p className="text-sm text-theme-text-muted mt-1">删除操作</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/20">
              <Trash2 size={24} className="text-red-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-theme-text-muted" />
            <select
              value={operationType}
              onChange={(e) => handleTypeFilterChange(e.target.value)}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2.5 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              {operationTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-theme-text-muted" />
            <select
              value={targetType}
              onChange={(e) => handleTargetFilterChange(e.target.value)}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2.5 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            >
              {targetTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-theme-text-muted" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleDateChange();
              }}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2.5 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            />
            <span className="text-theme-text-muted">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleDateChange();
              }}
              className="bg-theme-subtle border border-theme-border rounded-lg px-3 py-2.5 text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
            />
          </div>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOperationType('all');
              setTargetType('all');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
          >
            重置筛选
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-card/50">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-theme-text-secondary">操作人</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-theme-text-secondary">操作时间</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-theme-text-secondary">操作类型</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-theme-text-secondary">修改对象</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-theme-text-secondary">前后差异</th>
                <th className="text-right px-5 py-3 text-sm font-medium text-theme-text-secondary">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileText size={48} className="mx-auto text-theme-text-muted mb-4" />
                    <h3 className="text-lg font-medium text-theme-text mb-2">暂无日志</h3>
                    <p className="text-theme-text-muted">没有找到符合条件的操作记录</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const TypeIcon = operationTypeIcons[log.operationType];
                  const isExpanded = expandedId === log.id;
                  const hasChanges = log.changes && log.changes.length > 0;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="hover:bg-theme-card/30 transition-colors cursor-pointer"
                        onClick={() => hasChanges && toggleExpand(log.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 rounded-full flex items-center justify-center">
                              <User size={18} className="text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-theme-text">{log.operator}</p>
                              <p className="text-xs text-theme-text-muted mt-0.5">{log.operatorRole}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-theme-text-secondary flex items-center gap-1">
                            <Clock size={12} />
                            {log.operationTime}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${operationTypeColors[log.operationType]}`}
                          >
                            <TypeIcon size={12} />
                            {operationTypeLabels[log.operationType]}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm font-medium text-theme-text">{log.targetName}</p>
                            <p className="text-xs text-theme-text-muted mt-0.5">
                              {targetTypeOptions.find((t) => t.value === log.targetType)?.label ||
                                log.targetType}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {hasChanges ? (
                            <span className="text-sm text-theme-text-secondary">
                              {log.changes?.length} 项变更
                            </span>
                          ) : (
                            <span className="text-sm text-theme-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            {hasChanges && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(log.id);
                                }}
                                className="text-climbing-orange-400 hover:text-climbing-orange-300 hover:bg-climbing-orange-500/10"
                              >
                                {isExpanded ? '收起' : '查看详情'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasChanges && (
                        <tr key={`${log.id}-expanded`} className="bg-theme-card/20">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="bg-theme-subtle/50 rounded-lg p-4">
                              <h4 className="text-sm font-medium text-theme-text mb-3 flex items-center gap-2">
                                <ArrowLeftRight size={14} className="text-climbing-orange-400" />
                                变更详情
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-theme-border">
                                      <th className="text-left py-2 px-3 text-theme-text-secondary font-medium">
                                        字段
                                      </th>
                                      <th className="text-left py-2 px-3 text-theme-text-secondary font-medium">
                                        修改前
                                      </th>
                                      <th className="text-left py-2 px-3 text-theme-text-secondary font-medium">
                                        修改后
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {log.changes?.map((change) => (
                                      <tr
                                        key={change.field}
                                        className="border-b border-theme-border/50 last:border-0"
                                      >
                                        <td className="py-2 px-3 text-theme-text font-medium">
                                          {change.field}
                                        </td>
                                        <td className="py-2 px-3 text-red-400">
                                          {change.before}
                                        </td>
                                        <td className="py-2 px-3 text-green-400">
                                          {change.after}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-theme-border">
            <span className="text-sm text-theme-text-muted">
              共 {filteredLogs.length} 条记录
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2"
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'primary' : 'ghost'}
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
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
