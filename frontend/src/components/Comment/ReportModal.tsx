import { useState } from 'react';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import type { ReportReason } from '@/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description?: string) => Promise<void>;
  userName?: string;
}

const reasonOptions: { value: ReportReason; label: string; desc: string }[] = [
  { value: 'spam', label: '垃圾信息', desc: '广告、重复内容、恶意刷屏' },
  { value: 'harassment', label: '骚扰或辱骂', desc: '人身攻击、歧视性言论' },
  { value: 'inappropriate', label: '不当内容', desc: '色情、暴力、违法信息' },
  { value: 'false_info', label: '虚假信息', desc: '误导性内容、谣言' },
  { value: 'other', label: '其他原因', desc: '其他需要举报的情况' },
];

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  userName,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedReason, description || undefined);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`举报${userName ? `「${userName}」的评论` : '评论'}`}
      size="md"
    >
      <div className="space-y-5">
        <div>
          <p className="text-sm text-theme-text-secondary mb-3">请选择举报原因：</p>
          <div className="space-y-2">
            {reasonOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedReason(opt.value)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  selectedReason === opt.value
                    ? 'border-climbing-orange-500 bg-climbing-orange-500/10'
                    : 'border-theme-border hover:border-theme-border bg-theme-subtle'
                }`}
              >
                <p
                  className={`font-medium ${
                    selectedReason === opt.value
                      ? 'text-climbing-orange-400'
                      : 'text-theme-text'
                  }`}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-theme-text-muted mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-theme-text-secondary mb-2">
            补充说明（可选，最多1000字）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            placeholder="请详细描述举报内容..."
            rows={4}
            className="w-full px-3 py-2 bg-theme-subtle border border-theme-border rounded-lg text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-climbing-orange-500 resize-none"
          />
          <p className="text-xs text-theme-text-muted text-right mt-1">
            {description.length}/1000
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" fullWidth onClick={handleClose}>
            取消
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            isLoading={isSubmitting}
          >
            提交举报
          </Button>
        </div>
      </div>
    </Modal>
  );
}
