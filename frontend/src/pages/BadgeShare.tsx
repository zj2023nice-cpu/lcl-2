import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy,
  Mountain,
  User,
  ArrowLeft,
  Download,
  Share2,
  Home,
  Star,
  Calendar,
  Target,
  Flame,
  Zap,
  Award,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { BadgeShareData, BadgeRarity, BadgeConditionType } from '@/types';
import { badgeApi } from '@/utils/api';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

const rarityConfig: Record<BadgeRarity, {
  label: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}> = {
  common: {
    label: '普通',
    bgGradient: 'from-green-500 to-emerald-600',
    borderColor: '#22C55E',
    textColor: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  rare: {
    label: '稀有',
    bgGradient: 'from-blue-500 to-indigo-600',
    borderColor: '#3B82F6',
    textColor: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  legendary: {
    label: '传说',
    bgGradient: 'from-amber-400 via-orange-500 to-red-500',
    borderColor: '#F59E0B',
    textColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.5)',
  },
};

const conditionLabels: Record<BadgeConditionType, { label: string; icon: typeof Target }> = {
  total_ascents: { label: '攀爬次数', icon: Mountain },
  max_grade: { label: '最高难度', icon: Star },
  checkin_streak: { label: '连续打卡', icon: Flame },
  flash_count: { label: 'Flash次数', icon: Zap },
  onsight_count: { label: 'Onsight次数', icon: Award },
  total_comments: { label: '评论数', icon: Target },
  total_likes: { label: '获赞数', icon: Sparkles },
  routes_set: { label: '发布线路', icon: Mountain },
  gym_visits: { label: '岩馆到访', icon: Mountain },
  months_active: { label: '活跃月数', icon: Calendar },
};

export default function BadgeShare() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<BadgeShareData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shareId) {
      loadShareData(parseInt(shareId, 10));
    }
  }, [shareId]);

  const loadShareData = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await badgeApi.getSharedBadge(id);
      setShareData(data);

      const qrUrl = await QRCode.toDataURL(window.location.href, {
        width: 120,
        margin: 1,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(qrUrl);
    } catch (err: any) {
      setError(err?.message || '分享链接无效或徽章不存在');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!posterRef.current || !shareData) return;

    try {
      setExporting(true);
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#111827',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `${shareData.badge.name}-分享.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!shareData) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${shareData.user.name}获得了「${shareData.badge.name}」徽章！`,
          text: `${shareData.badge.description} - 攀岩成就系统`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    } catch {
      // User cancelled or failed
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rock-dark-900 via-rock-dark-800 to-rock-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-climbing-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-rock-light-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rock-dark-900 via-rock-dark-800 to-rock-dark-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">无法查看徽章</h2>
          <p className="text-rock-light-400 mb-8">
            {error || '分享链接无效、徽章已被删除或尚未解锁'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-rock-dark-700 hover:bg-rock-dark-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft size={18} />
              返回
            </button>
            <Link
              to="/"
              className="px-6 py-3 bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-600 hover:from-climbing-orange-400 hover:to-climbing-orange-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Home size={18} />
              回到首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const config = rarityConfig[shareData.badge.rarity];

  return (
    <div className="min-h-screen bg-gradient-to-br from-rock-dark-900 via-rock-dark-800 to-rock-dark-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-rock-dark-700/50 hover:bg-rock-dark-700 text-rock-light-300 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rock-dark-700/50 hover:bg-rock-dark-700 text-rock-light-300 transition-colors"
          >
            <Home size={18} />
            <span className="text-sm">首页</span>
          </Link>
        </div>

        <div
          ref={posterRef}
          className="relative overflow-hidden rounded-3xl shadow-2xl"
          style={{
            border: `2px solid ${config.borderColor}40`,
          }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-10`}
          />

          {shareData.badge.rarity === 'legendary' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute w-40 h-40 rounded-full opacity-20 animate-float"
                style={{
                  top: '10%',
                  left: '5%',
                  background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
                  animationDelay: '0s',
                }}
              />
              <div
                className="absolute w-32 h-32 rounded-full opacity-20 animate-float"
                style={{
                  top: '60%',
                  right: '10%',
                  background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
                  animationDelay: '1s',
                }}
              />
              <div
                className="absolute w-24 h-24 rounded-full opacity-15 animate-float"
                style={{
                  bottom: '15%',
                  left: '15%',
                  background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
                  animationDelay: '0.5s',
                }}
              />
            </div>
          )}

          <div className={`h-3 bg-gradient-to-r ${config.bgGradient}`} />

          <div className="relative p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Mountain size={22} style={{ color: config.textColor }} />
                <span className="font-medium text-rock-light-300">攀岩成就徽章</span>
              </div>
              <span
                className="px-4 py-1.5 text-sm font-semibold rounded-full border-2"
                style={{
                  borderColor: config.borderColor,
                  color: config.textColor,
                  backgroundColor: `${config.borderColor}15`,
                }}
              >
                {config.label}徽章
              </span>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div
                className={`relative w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br ${config.bgGradient} border-4 mb-6`}
                style={{
                  borderColor: config.borderColor,
                  boxShadow: `0 0 60px ${config.glowColor}, 0 0 120px ${config.glowColor}40`,
                }}
              >
                <Trophy size={64} className="text-white drop-shadow-lg" />
                {shareData.badge.rarity === 'legendary' && (
                  <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)',
                      animation: 'shine 2.5s linear infinite',
                    }}
                  />
                )}
              </div>

              <h1
                className="text-4xl font-bold text-white mb-3 text-center"
                style={{
                  textShadow: `0 0 30px ${config.glowColor}`,
                }}
              >
                {shareData.badge.name}
              </h1>
              <p className="text-rock-light-400 text-center text-lg max-w-md">
                {shareData.badge.description}
              </p>
            </div>

            <div
              className="rounded-2xl p-6 mb-8"
              style={{
                backgroundColor: `${config.borderColor}08`,
                border: `1px solid ${config.borderColor}20`,
              }}
            >
              <h3 className="text-sm font-semibold text-rock-light-400 mb-4 uppercase tracking-wider">
                解锁条件
              </h3>
              <div className="space-y-3">
                {shareData.badge.conditions.map((condition, index) => {
                  const conditionInfo = conditionLabels[condition.type];
                  const Icon = conditionInfo?.icon || Target;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 bg-rock-dark-800/50 rounded-xl p-4"
                    >
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${config.borderColor}20` }}
                      >
                        <Icon size={22} style={{ color: config.textColor }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {conditionInfo?.label || condition.type}
                        </p>
                        <p className="text-sm text-rock-light-500">
                          {condition.operator === '>=' ? '达到或超过' : condition.operator === '==' ? '等于' : '不超过'}{' '}
                          <span className="font-semibold" style={{ color: config.textColor }}>
                            {condition.value}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-2xl font-bold"
                          style={{ color: config.textColor }}
                        >
                          ✓
                        </div>
                        <p className="text-xs text-rock-light-500">已完成</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-rock-dark-800/60 rounded-2xl p-6 mb-8 border border-rock-dark-700">
              <div className="flex items-center gap-5 mb-6">
                <div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 flex items-center justify-center shadow-lg"
                >
                  <User size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-bold text-white">{shareData.user.name}</p>
                  <p className="text-rock-light-400 flex items-center gap-2 mt-1">
                    <Calendar size={14} />
                    解锁于{' '}
                    {new Date(shareData.unlockedAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-rock-dark-900/50 rounded-xl p-4 text-center">
                  <p
                    className="text-3xl font-bold mb-1"
                    style={{ color: config.textColor }}
                  >
                    {shareData.badge.points}
                  </p>
                  <p className="text-xs text-rock-light-500">获得积分</p>
                </div>
                <div className="bg-rock-dark-900/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold mb-1 text-climbing-orange-500">
                    {shareData.user.unlockedCount}
                  </p>
                  <p className="text-xs text-rock-light-500">已解锁徽章</p>
                </div>
                <div className="bg-rock-dark-900/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold mb-1 text-purple-400">
                    {shareData.user.totalPoints}
                  </p>
                  <p className="text-xs text-rock-light-500">累计总积分</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-rock-dark-800/40 rounded-2xl border border-rock-dark-700/50">
              <div>
                <p className="text-sm font-medium text-rock-light-300 mb-2">扫码查看此徽章</p>
                <div className="flex items-center gap-2">
                  <Mountain size={14} className="text-rock-light-500" />
                  <span className="text-xs text-rock-light-500">
                    攀岩成就系统 · 记录每一次进步
                  </span>
                </div>
              </div>
              {qrDataUrl && (
                <div className="bg-white p-2 rounded-xl shadow-lg">
                  <img
                    src={qrDataUrl}
                    alt="分享二维码"
                    className="w-24 h-24"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-600 hover:from-climbing-orange-400 hover:to-climbing-orange-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-climbing-orange-500/20 disabled:opacity-50"
          >
            <Download size={20} />
            {exporting ? '生成中...' : '保存图片'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 hover:from-purple-500 hover:via-pink-500 hover:to-red-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
          >
            <Share2 size={20} />
            分享给好友
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-rock-dark-700 text-center">
          <p className="text-rock-light-600 text-sm">
            攀岩管理系统 · 岩壁之上，每一次坚持都值得被记录
          </p>
        </div>
      </div>
    </div>
  );
}
