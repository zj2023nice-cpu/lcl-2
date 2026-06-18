import { useState } from 'react';
import {
  ArrowUpDown,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  FilterX,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Bookmark,
  X,
} from 'lucide-react';
import type { SortCriterion, SortField, SortDirection, AdvancedSortProps } from '@/types';
import { useSortPresets } from '@/hooks/useSortPresets';
import { useMessage } from '@/hooks/useMessage';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { cn } from '@/lib/utils';

const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'grade', label: '难度' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'ascentCount', label: '攀爬次数' },
  { value: 'avgRating', label: '平均评分' },
  { value: 'setterRating', label: '定线员评分' },
];

const DIRECTION_LABELS: Record<SortDirection, string> = {
  asc: '升序',
  desc: '降序',
};

function generateCriterionId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getDefaultCriteria(): SortCriterion[] {
  return [
    { id: generateCriterionId(), field: 'createdAt', direction: 'desc' },
  ];
}

export default function AdvancedSort({
  criteria,
  onChange,
  onReset,
  onClearFilters,
}: AdvancedSortProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const { presets, savePreset, deletePreset, loadPreset } = useSortPresets();
  const { success, error, warning } = useMessage();

  const handleAddCriterion = () => {
    const usedFields = new Set(criteria.map(c => c.field));
    const availableField = SORT_FIELD_OPTIONS.find(o => !usedFields.has(o.value));
    if (!availableField) {
      warning('所有排序维度已使用');
      return;
    }
    onChange([
      ...criteria,
      { id: generateCriterionId(), field: availableField.value, direction: 'desc' },
    ]);
  };

  const handleRemoveCriterion = (id: string) => {
    if (criteria.length <= 1) {
      warning('至少需要保留一个排序条件');
      return;
    }
    onChange(criteria.filter(c => c.id !== id));
  };

  const handleUpdateCriterion = (id: string, updates: Partial<SortCriterion>) => {
    onChange(
      criteria.map(c => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleToggleDirection = (id: string) => {
    onChange(
      criteria.map(c =>
        c.id === id
          ? { ...c, direction: c.direction === 'asc' ? 'desc' : 'asc' }
          : c
      )
    );
  };

  const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === criteria.length - 1)
    ) {
      return;
    }
    const newCriteria = [...criteria];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCriteria[index], newCriteria[targetIndex]] = [newCriteria[targetIndex], newCriteria[index]];
    onChange(newCriteria);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      error('请输入方案名称');
      return;
    }
    savePreset(presetName, criteria);
    setPresetName('');
    setShowSaveDialog(false);
    success('排序方案已保存');
  };

  const handleLoadPreset = (id: string) => {
    const loaded = loadPreset(id);
    if (loaded) {
      onChange(loaded);
      success('排序方案已应用');
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deletePreset(id);
    success('排序方案已删除');
  };

  const handleReset = () => {
    onChange(getDefaultCriteria());
    onReset();
    success('已恢复默认排序');
  };

  const handleClearFilters = () => {
    onClearFilters?.();
    success('已清除所有筛选条件');
  };

  const getAvailableFields = (currentId: string) => {
    const usedFields = new Set(
      criteria.filter(c => c.id !== currentId).map(c => c.field)
    );
    return SORT_FIELD_OPTIONS.filter(o => !usedFields.has(o.value));
  };

  const getSummaryText = () => {
    if (criteria.length === 0) return '未设置排序';
    return criteria
      .map(c => {
        const field = SORT_FIELD_OPTIONS.find(o => o.value === c.field)?.label || c.field;
        return `${field}${c.direction === 'asc' ? '↑' : '↓'}`;
      })
      .join(' → ');
  };

  return (
    <>
      <Button variant="outline" size="md" onClick={() => setIsOpen(true)}>
        <ArrowUpDown size={16} className="mr-2" />
        高级排序
        {criteria.length > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-climbing-orange-500/20 text-climbing-orange-400 text-xs rounded">
            {criteria.length}
          </span>
        )}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="高级排序"
        size="lg"
      >
        <div className="space-y-5">
          <div className="text-sm text-rock-light-400">
            当前排序：<span className="text-white">{getSummaryText()}</span>
          </div>

          <div className="space-y-3">
            {criteria.map((criterion, index) => {
              const availableFields = getAvailableFields(criterion.id);
              return (
                <div
                  key={criterion.id}
                  className="flex items-center gap-3 p-3 bg-rock-dark-900 rounded-lg border border-rock-dark-700"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveCriterion(index, 'up')}
                      disabled={index === 0}
                      className={cn(
                        'p-0.5 rounded transition-colors',
                        index === 0
                          ? 'text-rock-light-700 cursor-not-allowed'
                          : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700'
                      )}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveCriterion(index, 'down')}
                      disabled={index === criteria.length - 1}
                      className={cn(
                        'p-0.5 rounded transition-colors',
                        index === criteria.length - 1
                          ? 'text-rock-light-700 cursor-not-allowed'
                          : 'text-rock-light-400 hover:text-white hover:bg-rock-dark-700'
                      )}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <GripVertical size={18} className="text-rock-light-600" />

                  <span className="text-sm text-rock-light-500 w-6">{index + 1}.</span>

                  <select
                    value={criterion.field}
                    onChange={(e) =>
                      handleUpdateCriterion(criterion.id, {
                        field: e.target.value as SortField,
                      })
                    }
                    className="flex-1 bg-rock-dark-800 border border-rock-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-climbing-orange-500"
                  >
                    {[...availableFields, SORT_FIELD_OPTIONS.find(o => o.value === criterion.field)!]
                      .filter((v, i, a) => a.findIndex(t => t.value === v.value) === i)
                      .map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </select>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleDirection(criterion.id)}
                    className="min-w-[80px]"
                  >
                    {criterion.direction === 'asc' ? (
                      <ChevronUp size={14} className="mr-1" />
                    ) : (
                      <ChevronDown size={14} className="mr-1" />
                    )}
                    {DIRECTION_LABELS[criterion.direction]}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCriterion(criterion.id)}
                    className="p-2 h-auto text-rock-light-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCriterion}
            disabled={criteria.length >= SORT_FIELD_OPTIONS.length}
            fullWidth
          >
            <Plus size={16} className="mr-2" />
            添加排序条件
          </Button>

          <div className="pt-4 border-t border-rock-dark-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Bookmark size={14} />
                我的排序方案
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(true)}>
                <Save size={14} className="mr-1" />
                保存当前方案
              </Button>
            </div>

            {presets.length === 0 ? (
              <div className="text-center py-6 text-rock-light-500 text-sm">
                暂无保存的排序方案
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset.id)}
                    className="flex items-center justify-between p-3 bg-rock-dark-900 rounded-lg border border-rock-dark-700 cursor-pointer hover:border-climbing-orange-500/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-xs text-rock-light-500 mt-0.5 truncate">
                        {preset.criteria
                          .map(c => {
                            const field = SORT_FIELD_OPTIONS.find(o => o.value === c.field)?.label || c.field;
                            return `${field}${c.direction === 'asc' ? '↑' : '↓'}`;
                          })
                          .join(' → ')}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      className="p-1.5 h-auto text-rock-light-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-rock-dark-700">
            {onClearFilters && (
              <Button variant="secondary" onClick={handleClearFilters}>
                <FilterX size={16} className="mr-2" />
                清除所有筛选
              </Button>
            )}
            <Button variant="outline" onClick={handleReset} className="sm:ml-auto">
              <RotateCcw size={16} className="mr-2" />
              恢复默认排序
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              应用排序
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title="保存排序方案"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              方案名称
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="例如：热门线路优先"
              className="w-full px-3 py-2 bg-rock-dark-900 border border-rock-dark-600 rounded-lg text-white placeholder-rock-light-600 focus:outline-none focus:border-climbing-orange-500"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowSaveDialog(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button variant="primary" onClick={handleSavePreset} className="flex-1">
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
