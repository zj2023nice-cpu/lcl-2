import { X, Trophy, Calendar, Target, Share2, Download } from 'lucide-react';
import type { UserBadge, BadgeRarity, BadgeConditionType } from '@/types';
import BadgeCard from './BadgeCard';
import Modal from '@/components/UI/Modal';

const rarityConfig: Record<BadgeRarity, {
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}> = {
  common: {
    label: '普通',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500/50',
    textClass: 'text-green-400',
  },
  rare: {
    label: '稀有',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    textClass: 'text-blue-400',
  },
  legendary: {
    label: '传说',
    bgClass: 'bg-amber-500/20',
    borderClass: 'border-amber-500/50',
    textClass: 'text-amber-400',
  },
};

const conditionLabels: Record<BadgeConditionType, string> = {
  total_ascents: '完攀线路',
  max_grade: '最高难度',
  checkin_streak: '连续打卡',
  flash_count: 'Flash次数',
  onsight_count: 'Onsight次数',
  total_comments: '评论数量',
  total_likes: '获得点赞',
  routes_set: '定线数量',
  gym_visits: '到访岩馆',
  months_active: '活跃月数',
};

const conditionUnits: Partial<Record<BadgeConditionType, string>> = {
  max_grade: 'V级',
  checkin_streak: '天',
  months_active: '月',
};

interface BadgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBadge: UserBadge;
  onGeneratePoster: () => void;
}

export default function BadgeDetailModal({
  isOpen,
  onClose,
  userBadge,
  onGeneratePoster,
}: BadgeDetailModalProps) {
  const { badge, unlocked, progress, progressDetails, unlockedAt } = userBadge;
  const config = badge ? rarityConfig[badge.rarity] : rarityConfig.common;

  if (!badge) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-theme-hover hover:bg-theme-border text-theme-text transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <BadgeCard userBadge={userBadge} size="lg" showProgress={false} />
            <div className="mt-4 text-center">
              <div className="flex items-center gap-2 justify-center mb-2">
                <h3 className="text-2xl font-bold text-theme-text">{badge.name}</h3>
                <span
                  className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${config.bgClass} ${config.borderClass} ${config.textClass}`}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-theme-text-secondary">{badge.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-theme-card/50 rounded-xl p-4 border border-theme-border">
              <div className="flex items-center gap-2 mb-1">
                <Trophy size={16} className="text-yellow-400" />
                <span className="text-xs text-theme-text-muted">积分</span>
              </div>
              <p className="text-2xl font-bold text-theme-text">{badge.points}</p>
            </div>
            <div className="bg-theme-card/50 rounded-xl p-4 border border-theme-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} className="text-blue-400" />
                <span className="text-xs text-theme-text-muted">解锁时间</span>
              </div>
              <p className="text-lg font-bold text-theme-text">
                {unlocked && unlockedAt
                  ? new Date(unlockedAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '未解锁'}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-climbing-orange-500" />
              <h4 className="font-medium text-theme-text">解锁条件</h4>
            </div>
            <div className="space-y-3">
              {badge.conditions.map((condition, index) => {
                const currentProgress = progressDetails?.[condition.type] || 0;
                const unit = conditionUnits[condition.type] || '';
                const isMet = currentProgress >= 100;

                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-theme-text-secondary">
                        {conditionLabels[condition.type]}
                      </span>
                      <span className={isMet ? 'text-green-400' : 'text-theme-text-muted'}>
                        {Math.round(
                          (currentProgress / 100) * condition.value
                        )}
                        {unit} / {condition.value}
                        {unit}
                      </span>
                    </div>
                    <div className="h-2 bg-theme-hover rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isMet
                            ? 'bg-gradient-to-r from-green-500 to-green-400'
                            : 'bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400'
                        }`}
                        style={{ width: `${Math.min(100, currentProgress)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!unlocked && (
            <div className="mb-6 p-4 bg-theme-card/50 rounded-xl border border-theme-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-theme-text-secondary">总进度</span>
                <span className="text-sm font-medium text-theme-text">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-3 bg-theme-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {unlocked && (
              <button
                onClick={onGeneratePoster}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-purple-500/30"
              >
                <Share2 size={18} />
                生成海报
              </button>
            )}
            <button
              onClick={onClose}
              className={`${unlocked ? 'flex-1' : 'w-full'} px-4 py-2.5 bg-theme-hover hover:bg-theme-border text-theme-text rounded-lg font-medium transition-all`}
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
