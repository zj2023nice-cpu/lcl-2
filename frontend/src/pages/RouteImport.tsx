import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Download,
  Edit3,
  Trash2,
  RotateCcw,
  Layers,
} from 'lucide-react';
import Card from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { routeApi, wallApi } from '@/utils/api';
import { useGymStore } from '@/store/gym';
import { useAuthStore } from '@/store/auth';
import { useMessage } from '@/hooks/useMessage';
import type {
  RouteBatchImportParseResult,
  ValidatedRouteRow,
  RouteValidationFailure,
  RouteBatchImportResult,
  RouteType,
  Wall,
} from '@/types';

type Step = 'upload' | 'preview' | 'confirm' | 'report';

const routeTypeLabels: Record<string, string> = {
  boulder: '抱石',
  lead: '先锋',
  top_rope: '顶绳',
  speed: '速度',
};

const routeTypeOptions: RouteType[] = ['boulder', 'lead', 'top_rope', 'speed'];

export default function RouteImport() {
  const navigate = useNavigate();
  const { currentGym } = useGymStore();
  const { user: authUser } = useAuthStore();
  const { success: msgSuccess, error: msgError, warning: msgWarning } = useMessage();

  const canImport =
    authUser?.role === 'platform_admin' || authUser?.role === 'gym_admin';

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<RouteBatchImportParseResult | null>(null);
  const [walls, setWalls] = useState<Wall[]>([]);

  const [editedFailures, setEditedFailures] = useState<RouteValidationFailure[]>([]);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const [isConfirming, setIsConfirming] = useState(false);
  const [importResult, setImportResult] = useState<RouteBatchImportResult | null>(null);

  const [selectedWallId, setSelectedWallId] = useState<number | ''>('');

  const fetchWalls = useCallback(async () => {
    if (!currentGym) return;
    try {
      const data = await wallApi.getWalls(currentGym.id);
      setWalls(data);
    } catch {
      msgError('获取岩壁列表失败');
    }
  }, [currentGym, msgError]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.csv') && !selected.name.endsWith('.txt')) {
        msgError('仅支持 CSV 格式文件');
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        msgError('文件大小不能超过 2MB');
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      if (!dropped.name.endsWith('.csv') && !dropped.name.endsWith('.txt')) {
        msgError('仅支持 CSV 格式文件');
        return;
      }
      if (dropped.size > 2 * 1024 * 1024) {
        msgError('文件大小不能超过 2MB');
        return;
      }
      setFile(dropped);
    }
  };

  const handleParse = async () => {
    if (!file || !currentGym) return;
    setIsParsing(true);
    try {
      const result = await routeApi.batchImportParse(currentGym.id, file);
      setParseResult(result);
      setEditedFailures(result.failures.map((f) => ({ ...f })));
      setStep('preview');
      await fetchWalls();
      if (result.failureCount > 0) {
        msgWarning(`解析完成：${result.validCount} 行有效，${result.failureCount} 行存在错误，请检查并修正`);
      } else {
        msgSuccess(`解析完成：全部 ${result.validCount} 行数据有效`);
      }
    } catch (err: any) {
      const reason = err?.message || err?.error || '解析失败，请检查CSV格式';
      msgError(reason);
    } finally {
      setIsParsing(false);
    }
  };

  const handleStartEdit = (lineNumber: number, failure: RouteValidationFailure) => {
    setEditingRow(lineNumber);
    setEditForm({
      name: failure.row.name,
      type: failure.row.type,
      grade: failure.row.grade,
      color: failure.row.color,
      wallId: failure.row.wallId,
      setterId: failure.row.setterId,
      tags: failure.row.tags,
      length: failure.row.length,
      openDate: failure.row.openDate,
      plannedRemoveDate: failure.row.plannedRemoveDate,
      holdX: failure.row.holdX,
      holdY: failure.row.holdY,
      holdType: failure.row.holdType,
    });
  };

  const handleSaveEdit = (lineNumber: number) => {
    setEditedFailures((prev) =>
      prev.map((f) => {
        if (f.lineNumber !== lineNumber) return f;
        const newRow = {
          ...f.row,
          name: editForm.name || '',
          type: editForm.type || '',
          grade: editForm.grade || '',
          color: editForm.color || '',
          wallId: editForm.wallId || '',
          setterId: editForm.setterId || '',
          tags: editForm.tags || '',
          length: editForm.length || '',
          openDate: editForm.openDate || '',
          plannedRemoveDate: editForm.plannedRemoveDate || '',
          holdX: editForm.holdX || '',
          holdY: editForm.holdY || '',
          holdType: editForm.holdType || '',
        };
        const reasons: string[] = [];
        if (!newRow.name.trim()) reasons.push('线路名称不能为空');
        else if (newRow.name.length > 200) reasons.push('线路名称不能超过200字符');

        const validTypes = ['boulder', 'lead', 'top_rope', 'speed'];
        if (!newRow.type.trim()) reasons.push('线路类型不能为空');
        else if (!validTypes.includes(newRow.type.trim().toLowerCase())) reasons.push('线路类型无效');

        if (!newRow.grade.trim()) reasons.push('难度不能为空');
        else {
          const vMatch = newRow.grade.trim().match(/^V\d+$/i);
          const ydsMatch = newRow.grade.trim().match(/^5\.\d+[a-d]?$/);
          if (!vMatch && !ydsMatch) reasons.push('难度格式无效');
        }

        const parsedWallId = parseInt(newRow.wallId, 10);
        if (!newRow.wallId.trim()) reasons.push('岩壁ID不能为空');
        else if (isNaN(parsedWallId)) reasons.push('岩壁ID格式无效');
        else {
          const wallExists = walls.some((w) => w.id === parsedWallId);
          if (!wallExists) reasons.push(`岩壁ID ${parsedWallId} 不属于当前场馆`);
        }

        if (newRow.length && isNaN(parseFloat(newRow.length))) reasons.push('长度格式无效');

        const hasHoldX = newRow.holdX.trim() !== '';
        const hasHoldY = newRow.holdY.trim() !== '';
        const hasHoldType = newRow.holdType.trim() !== '';
        const holdFieldCount = [hasHoldX, hasHoldY, hasHoldType].filter(Boolean).length;
        if (holdFieldCount > 0 && holdFieldCount < 3) {
          reasons.push('岩点坐标字段需同时填写 hold_x、hold_y、hold_type，或全部留空');
        } else if (holdFieldCount === 3) {
          const xNum = parseFloat(newRow.holdX);
          if (isNaN(xNum)) reasons.push('hold_x 格式无效');
          else if (xNum < 0 || xNum > 100) reasons.push('hold_x 超出范围 (0-100)');

          const yNum = parseFloat(newRow.holdY);
          if (isNaN(yNum)) reasons.push('hold_y 格式无效');
          else if (yNum < 0 || yNum > 100) reasons.push('hold_y 超出范围 (0-100)');

          const validHoldTypes = ['start', 'hold', 'end'];
          if (!validHoldTypes.includes(newRow.holdType.trim().toLowerCase())) {
            reasons.push('hold_type 无效，有效值: start / hold / end');
          }
        }

        return { ...f, row: newRow, reasons };
      }),
    );
    setEditingRow(null);
    setEditForm({});
  };

  const handleRemoveRow = (lineNumber: number) => {
    setEditedFailures((prev) => prev.filter((f) => f.lineNumber !== lineNumber));
  };

  const getValidRowsFromEditedFailures = (): ValidatedRouteRow[] => {
    const validRows: ValidatedRouteRow[] = [...(parseResult?.validRows || [])];

    for (const f of editedFailures) {
      if (f.reasons.length === 0) {
        const parsedWallId = parseInt(f.row.wallId, 10);
        const parsedSetterId = f.row.setterId ? parseInt(f.row.setterId, 10) : undefined;
        const parsedLength = f.row.length ? parseFloat(f.row.length) : undefined;
        const tags = f.row.tags
          ? f.row.tags.split(/[;；]/).map((t) => t.trim()).filter((t) => t)
          : undefined;

        const hasHoldX = f.row.holdX.trim() !== '';
        const hasHoldY = f.row.holdY.trim() !== '';
        const hasHoldType = f.row.holdType.trim() !== '';
        const holdFieldCount = [hasHoldX, hasHoldY, hasHoldType].filter(Boolean).length;
        let holdX: number | undefined;
        let holdY: number | undefined;
        let holdType: string | undefined;
        if (holdFieldCount === 3) {
          holdX = parseFloat(f.row.holdX);
          holdY = parseFloat(f.row.holdY);
          holdType = f.row.holdType.trim().toLowerCase();
        }

        validRows.push({
          lineNumber: f.lineNumber,
          name: f.row.name.trim(),
          type: f.row.type.trim().toLowerCase() as RouteType,
          grade: f.row.grade.trim(),
          color: f.row.color?.trim() || undefined,
          wallId: parsedWallId,
          setterId: parsedSetterId && !isNaN(parsedSetterId) ? parsedSetterId : undefined,
          tags,
          length: parsedLength && !isNaN(parsedLength) ? parsedLength : undefined,
          openDate: f.row.openDate || undefined,
          plannedRemoveDate: f.row.plannedRemoveDate || undefined,
          holdX,
          holdY,
          holdType,
        });
      }
    }

    return validRows;
  };

  const handleConfirmImport = async () => {
    const validRows = getValidRowsFromEditedFailures();
    if (validRows.length === 0) {
      msgError('没有可导入的有效数据');
      return;
    }

    const targetWallId = selectedWallId || validRows[0]?.wallId;
    if (!targetWallId) {
      msgError('请选择目标岩壁');
      return;
    }

    setIsConfirming(true);
    try {
      const result = await routeApi.batchImportConfirm(currentGym!.id, {
        wallId: targetWallId,
        rows: validRows.map((r) => ({ ...r, wallId: targetWallId })),
      });
      setImportResult(result);
      setStep('report');
      if (result.success) {
        msgSuccess(`批量导入完成，成功创建 ${result.successCount} 条草稿线路`);
      } else {
        msgError(`导入部分失败，已回滚。失败 ${result.failureCount} 条`);
      }
    } catch (err: any) {
      const reason = err?.message || err?.error || '导入失败';
      msgError(reason);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setParseResult(null);
    setEditedFailures([]);
    setEditingRow(null);
    setEditForm({});
    setImportResult(null);
    setSelectedWallId('');
  };

  const handleDownloadTemplate = () => {
    const headers = 'name,type,grade,color,wall_id,setter_id,tags,length,open_date,planned_remove_date,hold_x,hold_y,hold_type';
    const example = '测试线路,boulder,V3,#FF6B35,1,1,力量;耐力,12,2025-01-01,2025-06-01,20,50,start';
    const csv = `${headers}\n${example}`;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canImport) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangle size={48} className="mx-auto text-theme-text-muted mb-4" />
        <h3 className="text-lg font-medium text-theme-text mb-2">无权限访问</h3>
        <p className="text-theme-text-muted mb-4">仅馆长或平台管理员可使用线路批量导入功能</p>
        <Button onClick={() => navigate('/admin/routes')}>返回线路管理</Button>
      </Card>
    );
  }

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'upload', label: '上传CSV', icon: <Upload size={16} /> },
    { key: 'preview', label: '预览校验', icon: <FileSpreadsheet size={16} /> },
    { key: 'confirm', label: '确认导入', icon: <CheckCircle2 size={16} /> },
    { key: 'report', label: '导入报告', icon: <Layers size={16} /> },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  const correctedFailuresCount = editedFailures.filter((f) => f.reasons.length === 0).length;
  const remainingErrorsCount = editedFailures.filter((f) => f.reasons.length > 0).length;
  const totalValidRows = (parseResult?.validCount ?? 0) + correctedFailuresCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-theme-text flex items-center gap-3">
            <Layers size={24} className="text-climbing-orange-400" />
            线路批量导入
          </h1>
          <p className="text-theme-text-muted mt-1">上传CSV文件批量导入线路，系统将自动校验格式并创建草稿线路</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
          <Download size={14} className="mr-1" />
          下载CSV模板
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                idx < currentStepIdx
                  ? 'text-green-400'
                  : idx === currentStepIdx
                    ? 'text-climbing-orange-400 bg-climbing-orange-500/10'
                    : 'text-theme-text-muted'
              }`}>
                {idx < currentStepIdx ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  s.icon
                )}
                <span>{s.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight size={16} className={`mx-2 ${idx < currentStepIdx ? 'text-green-400' : 'text-theme-text-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {step === 'upload' && (
        <Card className="p-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-theme-border hover:border-climbing-orange-500/50 hover:bg-climbing-orange-500/5'
            }`}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="space-y-3">
                <FileSpreadsheet size={48} className="mx-auto text-green-400" />
                <p className="text-lg font-medium text-theme-text">{file.name}</p>
                <p className="text-sm text-theme-text-secondary">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  重新选择
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload size={48} className="mx-auto text-theme-text-muted" />
                <p className="text-lg font-medium text-theme-text">点击或拖拽上传CSV文件</p>
                <p className="text-sm text-theme-text-muted">
                  支持格式：.csv / .txt，最大 2MB
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-theme-subtle rounded-lg">
            <h4 className="text-sm font-medium text-theme-text mb-2">CSV 表头格式要求</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-theme-text-secondary">
                    <th className="text-left px-2 py-1">字段</th>
                    <th className="text-left px-2 py-1">必填</th>
                    <th className="text-left px-2 py-1">说明</th>
                  </tr>
                </thead>
                <tbody className="text-theme-text-secondary">
                  <tr><td className="px-2 py-1 font-mono">name</td><td className="px-2 py-1">是</td><td className="px-2 py-1">线路名称，最长200字符</td></tr>
                  <tr><td className="px-2 py-1 font-mono">type</td><td className="px-2 py-1">是</td><td className="px-2 py-1">boulder / lead / top_rope / speed</td></tr>
                  <tr><td className="px-2 py-1 font-mono">grade</td><td className="px-2 py-1">是</td><td className="px-2 py-1">难度，如 V3 / 5.10a</td></tr>
                  <tr><td className="px-2 py-1 font-mono">color</td><td className="px-2 py-1">否</td><td className="px-2 py-1">颜色值，如 #FF6B35</td></tr>
                  <tr><td className="px-2 py-1 font-mono">wall_id</td><td className="px-2 py-1">是</td><td className="px-2 py-1">目标岩壁ID（需属于当前场馆）</td></tr>
                  <tr><td className="px-2 py-1 font-mono">setter_id</td><td className="px-2 py-1">否</td><td className="px-2 py-1">定线员用户ID</td></tr>
                  <tr><td className="px-2 py-1 font-mono">tags</td><td className="px-2 py-1">否</td><td className="px-2 py-1">标签，分号分隔</td></tr>
                  <tr><td className="px-2 py-1 font-mono">length</td><td className="px-2 py-1">否</td><td className="px-2 py-1">线路长度(米)</td></tr>
                  <tr><td className="px-2 py-1 font-mono">open_date</td><td className="px-2 py-1">否</td><td className="px-2 py-1">开放日期 YYYY-MM-DD</td></tr>
                  <tr><td className="px-2 py-1 font-mono">planned_remove_date</td><td className="px-2 py-1">否</td><td className="px-2 py-1">计划拆除日期</td></tr>
                  <tr><td className="px-2 py-1 font-mono">hold_x</td><td className="px-2 py-1">否</td><td className="px-2 py-1">岩点X坐标 (0-100)，需与 hold_y/hold_type 同时填写</td></tr>
                  <tr><td className="px-2 py-1 font-mono">hold_y</td><td className="px-2 py-1">否</td><td className="px-2 py-1">岩点Y坐标 (0-100)，需与 hold_x/hold_type 同时填写</td></tr>
                  <tr><td className="px-2 py-1 font-mono">hold_type</td><td className="px-2 py-1">否</td><td className="px-2 py-1">岩点类型：start / hold / end</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => navigate('/admin/routes')}>
              取消
            </Button>
            <Button variant="primary" onClick={handleParse} disabled={!file || isParsing} isLoading={isParsing}>
              {isParsing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  正在解析...
                </>
              ) : (
                <>
                  下一步：解析校验
                  <ChevronRight size={16} className="ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {step === 'preview' && parseResult && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-theme-subtle rounded-lg text-center">
                <p className="text-2xl font-bold text-theme-text">{parseResult.totalRows}</p>
                <p className="text-xs text-theme-text-muted mt-1">总行数</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{parseResult.validCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">校验通过</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{parseResult.failureCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">存在错误</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{parseResult.holdCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">岩点数量</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-400">{correctedFailuresCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">已手动修正</p>
              </div>
            </div>
          </Card>

          {parseResult.holdErrors.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-border bg-orange-500/5 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-400" />
                <span className="text-sm font-medium text-orange-400">岩点坐标错误明细 ({parseResult.holdErrors.length} 行)</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-theme-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium w-16">行号</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">坐标错误</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {parseResult.holdErrors.map((he) => (
                      <tr key={he.lineNumber} className="hover:bg-theme-card/30">
                        <td className="px-4 py-2 text-theme-text-muted">{he.lineNumber}</td>
                        <td className="px-4 py-2">
                          <div className="space-y-0.5">
                            {he.reasons.map((r, i) => (
                              <p key={i} className="text-xs text-orange-400">{r}</p>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {parseResult.validCount > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-border bg-green-500/5 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-400">校验通过的数据 ({parseResult.validCount} 行)</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-theme-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">行号</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">名称</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">类型</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">难度</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩壁ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {parseResult.validRows.map((row) => (
                      <tr key={row.lineNumber} className="hover:bg-theme-card/30">
                        <td className="px-4 py-2 text-theme-text-muted">{row.lineNumber}</td>
                        <td className="px-4 py-2 text-theme-text">{row.name}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {routeTypeLabels[row.type] || row.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-theme-text">{row.grade}</td>
                        <td className="px-4 py-2 text-theme-text-secondary">{row.wallId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {editedFailures.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-border bg-red-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-sm font-medium text-red-400">存在错误的数据 ({editedFailures.length} 行)</span>
                </div>
                {remainingErrorsCount > 0 && (
                  <span className="text-xs text-theme-text-muted">
                    修正 {correctedFailuresCount} 行，剩余 {remainingErrorsCount} 行错误
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-theme-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium w-12">行号</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">名称</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">类型</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">难度</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩壁ID</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">错误</th>
                      <th className="text-right px-4 py-2 text-theme-text-muted font-medium w-24">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {editedFailures.map((failure) => (
                      <tr
                        key={failure.lineNumber}
                        className={`${
                          failure.reasons.length === 0
                            ? 'bg-green-500/5'
                            : 'bg-red-500/5'
                        }`}
                      >
                        <td className="px-4 py-2 text-theme-text-muted">{failure.lineNumber}</td>
                        <td className="px-4 py-2 text-theme-text">{failure.row.name}</td>
                        <td className="px-4 py-2 text-theme-text">{failure.row.type}</td>
                        <td className="px-4 py-2 text-theme-text">{failure.row.grade}</td>
                        <td className="px-4 py-2 text-theme-text-secondary">{failure.row.wallId}</td>
                        <td className="px-4 py-2">
                          {failure.reasons.length === 0 ? (
                            <span className="text-xs text-green-400">已修正</span>
                          ) : (
                            <div className="space-y-0.5">
                              {failure.reasons.map((r, i) => (
                                <p key={i} className="text-xs text-red-400">{r}</p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(failure.lineNumber, failure)}
                              className="p-1 rounded hover:bg-theme-card text-theme-text-secondary hover:text-theme-text transition-colors"
                              title="编辑修正"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleRemoveRow(failure.lineNumber)}
                              className="p-1 rounded hover:bg-red-500/20 text-theme-text-secondary hover:text-red-400 transition-colors"
                              title="移除此行"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('upload')}>
              <ChevronLeft size={16} className="mr-1" />
              上一步
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw size={16} className="mr-1" />
                重新上传
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep('confirm')}
                disabled={totalValidRows === 0}
              >
                下一步：确认导入
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          <Modal
            isOpen={editingRow !== null}
            onClose={() => {
              setEditingRow(null);
              setEditForm({});
            }}
            title={`修正第 ${editingRow} 行数据`}
            size="lg"
          >
            {editingRow !== null && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">线路名称 *</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="必填"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">线路类型 *</label>
                    <select
                      value={editForm.type || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                    >
                      <option value="">请选择</option>
                      {routeTypeOptions.map((t) => (
                        <option key={t} value={t}>{routeTypeLabels[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">难度 *</label>
                    <input
                      type="text"
                      value={editForm.grade || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, grade: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="如 V3 / 5.10a"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">颜色</label>
                    <input
                      type="text"
                      value={editForm.color || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="如 #FF6B35"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">岩壁ID *</label>
                    <select
                      value={editForm.wallId || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, wallId: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                    >
                      <option value="">请选择岩壁</option>
                      {walls.map((w) => (
                        <option key={w.id} value={w.id}>{w.name} (ID: {w.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">定线员ID</label>
                    <input
                      type="text"
                      value={editForm.setterId || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, setterId: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">标签(分号分隔)</label>
                    <input
                      type="text"
                      value={editForm.tags || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="力量;耐力"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">长度(米)</label>
                    <input
                      type="text"
                      value={editForm.length || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, length: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">开放日期</label>
                    <input
                      type="date"
                      value={editForm.openDate || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, openDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">计划拆除日期</label>
                    <input
                      type="date"
                      value={editForm.plannedRemoveDate || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, plannedRemoveDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">岩点X坐标 (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={editForm.holdX || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, holdX: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="可选，如 20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">岩点Y坐标 (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={editForm.holdY || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, holdY: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                      placeholder="可选，如 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-theme-text-secondary mb-1">岩点类型</label>
                    <select
                      value={editForm.holdType || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, holdType: e.target.value }))}
                      className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
                    >
                      <option value="">不创建岩点</option>
                      <option value="start">start (起点)</option>
                      <option value="hold">hold (中途)</option>
                      <option value="end">end (终点)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingRow(null);
                      setEditForm({});
                    }}
                  >
                    取消
                  </Button>
                  <Button variant="primary" onClick={() => handleSaveEdit(editingRow)}>
                    保存修正
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      )}

      {step === 'confirm' && parseResult && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="p-4 bg-climbing-orange-500/10 border border-climbing-orange-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-climbing-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-climbing-orange-400">确认导入将创建草稿线路</p>
                  <p className="text-theme-text-secondary mt-1">
                    所有导入的线路状态将设为「定线中」，导入后可在线路管理中进一步编辑和发布。
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{totalValidRows}</p>
                <p className="text-xs text-theme-text-muted mt-1">将导入行数</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{remainingErrorsCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">未修正错误(将跳过)</p>
              </div>
              <div className="p-3 bg-gray-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-400">{editedFailures.filter((f) => f.reasons.length > 0).length}</p>
                <p className="text-xs text-theme-text-muted mt-1">已移除行数</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-theme-text">目标岩壁</label>
              <select
                value={selectedWallId}
                onChange={(e) => setSelectedWallId(e.target.value ? Number(e.target.value) : '')}
                className="w-full max-w-sm px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text text-sm focus:outline-none focus:border-climbing-orange-500"
              >
                <option value="">使用CSV中的岩壁ID</option>
                {walls.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} (ID: {w.id})</option>
                ))}
              </select>
              <p className="text-xs text-theme-text-muted">
                选择目标岩壁将覆盖CSV中所有行的岩壁ID；留空则使用CSV中各行的wall_id字段
              </p>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-theme-border bg-theme-card/40 text-sm text-theme-text-secondary">
              即将导入的数据明细 ({totalValidRows} 行)
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-theme-subtle sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">行号</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">名称</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">类型</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">难度</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩壁ID</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">颜色</th>
                    <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩点</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/50">
                  {getValidRowsFromEditedFailures().map((row) => (
                    <tr key={row.lineNumber} className="hover:bg-theme-card/30">
                      <td className="px-4 py-2 text-theme-text-muted">{row.lineNumber}</td>
                      <td className="px-4 py-2 text-theme-text">{row.name}</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {routeTypeLabels[row.type] || row.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-theme-text">{row.grade}</td>
                      <td className="px-4 py-2 text-theme-text-secondary">
                        {selectedWallId || row.wallId}
                      </td>
                      <td className="px-4 py-2">
                        {row.color && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-theme-border" style={{ backgroundColor: row.color }} />
                            <span className="text-theme-text-secondary text-xs">{row.color}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.holdX !== undefined && row.holdY !== undefined && row.holdType ? (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                            ({row.holdX}, {row.holdY}) {row.holdType}
                          </span>
                        ) : (
                          <span className="text-xs text-theme-text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('preview')}>
              <ChevronLeft size={16} className="mr-1" />
              上一步
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmImport}
              disabled={totalValidRows === 0 || isConfirming}
              isLoading={isConfirming}
            >
              {isConfirming ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  正在导入...
                </>
              ) : (
                '确认导入'
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'report' && importResult && (
        <div className="space-y-4">
          <Card className="p-4">
            {importResult.success ? (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
                <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-400">批量导入成功</p>
                  <p className="text-theme-text-secondary mt-1">
                    共导入 {importResult.totalRows} 条线路，全部成功创建为草稿状态{importResult.createdHolds > 0 ? `，并创建 ${importResult.createdHolds} 个岩点` : ''}。
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-400">批量导入部分失败，已回滚</p>
                  <p className="text-theme-text-secondary mt-1">
                    共 {importResult.totalRows} 条，失败 {importResult.failureCount} 条。为保证数据一致性，本次所有变更均已回滚。
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-theme-subtle rounded-lg text-center">
                <p className="text-2xl font-bold text-theme-text">{importResult.totalRows}</p>
                <p className="text-xs text-theme-text-muted mt-1">总导入行数</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-400">{importResult.successCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">成功创建</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-400">{importResult.createdHolds}</p>
                <p className="text-xs text-theme-text-muted mt-1">岩点数量</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-400">{importResult.failureCount}</p>
                <p className="text-xs text-theme-text-muted mt-1">失败</p>
              </div>
            </div>
          </Card>

          {importResult.createdRoutes.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-border bg-green-500/5 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-sm font-medium text-green-400">成功创建的线路</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-theme-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">ID</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">名称</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">类型</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">难度</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">岩壁ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {importResult.createdRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-theme-card/30">
                        <td className="px-4 py-2 text-theme-text-muted">#{r.id}</td>
                        <td className="px-4 py-2 text-theme-text">{r.name}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {routeTypeLabels[r.type] || r.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-theme-text">{r.grade}</td>
                        <td className="px-4 py-2 text-theme-text-secondary">{r.wallId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {importResult.failures.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-theme-border bg-red-500/5 flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <span className="text-sm font-medium text-red-400">失败明细</span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-theme-subtle sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">行号</th>
                      <th className="text-left px-4 py-2 text-theme-text-muted font-medium">失败原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50">
                    {importResult.failures.map((f, idx) => (
                      <tr key={`${f.lineNumber}-${idx}`} className="hover:bg-theme-card/30">
                        <td className="px-4 py-2 text-theme-text-muted">{f.lineNumber}</td>
                        <td className="px-4 py-2 text-red-400">{f.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw size={16} className="mr-2" />
              继续导入
            </Button>
            <Button variant="primary" onClick={() => navigate('/admin/routes')}>
              前往线路管理
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
