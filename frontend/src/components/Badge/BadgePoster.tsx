import { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, QrCode, Trophy, Mountain, User } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import type { BadgePosterData, BadgeRarity } from '@/types';
import Modal from '@/components/UI/Modal';
import { badgeApi } from '@/utils/api';

const rarityConfig: Record<BadgeRarity, {
  label: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
}> = {
  common: {
    label: '普通',
    bgGradient: 'from-green-600 to-green-800',
    borderColor: '#22C55E',
    textColor: '#22C55E',
  },
  rare: {
    label: '稀有',
    bgGradient: 'from-blue-600 to-blue-800',
    borderColor: '#3B82F6',
    textColor: '#3B82F6',
  },
  legendary: {
    label: '传说',
    bgGradient: 'from-amber-500 to-orange-600',
    borderColor: '#F59E0B',
    textColor: '#F59E0B',
  },
};

interface BadgePosterProps {
  isOpen: boolean;
  onClose: () => void;
  badgeId: number;
}

export default function BadgePoster({ isOpen, onClose, badgeId }: BadgePosterProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [posterData, setPosterData] = useState<BadgePosterData | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isOpen && badgeId) {
      loadPosterData();
    }
  }, [isOpen, badgeId]);

  const loadPosterData = async () => {
    try {
      setLoading(true);
      const data = await badgeApi.getBadgePosterData(badgeId);
      setPosterData(data);

      const qrUrl = await QRCode.toDataURL(data.qrContent, {
        width: 120,
        margin: 1,
        color: {
          dark: '#1F2937',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(qrUrl);
    } catch (error) {
      console.error('Failed to load poster data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!posterRef.current || !posterData) return;

    try {
      setExporting(true);
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#111827',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `${posterData.badge.name}-徽章.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate poster:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!posterRef.current || !posterData) return;

    try {
      setExporting(true);
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#111827',
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${posterData.badge.name}-徽章.png`, {
            type: 'image/png',
          });

          if (navigator.share) {
            try {
              await navigator.share({
                title: `${posterData.user.name}获得了「${posterData.badge.name}」徽章！`,
                text: posterData.badge.description,
                files: [file],
              });
            } catch {
              // User cancelled share
            }
          } else {
            handleDownload();
          }
        }
        setExporting(false);
      }, 'image/png');
    } catch (error) {
      console.error('Failed to share poster:', error);
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const config = posterData ? rarityConfig[posterData.badge.rarity] : rarityConfig.common;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-text mb-4 text-center">生成徽章海报</h3>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin w-8 h-8 border-2 border-climbing-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : posterData ? (
            <>
              <div className="flex justify-center mb-6">
                <div
                  ref={posterRef}
                  className="w-[360px] bg-gradient-to-b from-theme-subtle to-theme-card rounded-2xl overflow-hidden shadow-2xl"
                  style={{ borderColor: config.borderColor }}
                >
                  <div
                    className={`h-2 bg-gradient-to-r ${config.bgGradient}`}
                  />

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Mountain size={20} style={{ color: config.textColor }} />
                        <span className="text-sm font-medium text-theme-text-secondary">攀岩成就</span>
                      </div>
                      <span
                        className="px-3 py-1 text-xs font-medium rounded-full border"
                        style={{
                          borderColor: config.borderColor,
                          color: config.textColor,
                          backgroundColor: `${config.borderColor}20`,
                        }}
                      >
                        {config.label}徽章
                      </span>
                    </div>

                    <div className="flex flex-col items-center mb-6">
                      <div
                        className={`w-28 h-28 rounded-full flex items-center justify-center bg-gradient-to-br ${config.bgGradient} border-4 shadow-xl`}
                        style={{
                          borderColor: config.borderColor,
                          boxShadow: `0 0 40px ${config.borderColor}40`,
                        }}
                      >
                        <Trophy size={48} className="text-white" />
                      </div>
                    </div>

                    <div className="text-center mb-6">
                      <h2
                        className="text-2xl font-bold text-theme-text mb-2"
                        style={{ textShadow: `0 0 20px ${config.borderColor}60` }}
                      >
                        {posterData.badge.name}
                      </h2>
                      <p className="text-theme-text-secondary text-sm">
                        {posterData.badge.description}
                      </p>
                    </div>

                    <div className="bg-theme-card/50 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-climbing-orange-400 to-climbing-orange-600 flex items-center justify-center">
                          <User size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-theme-text">{posterData.user.name}</p>
                          <p className="text-xs text-theme-text-muted">
                            解锁于{' '}
                            {new Date(posterData.unlockedAt).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-theme-subtle/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold" style={{ color: config.textColor }}>
                            {posterData.badge.points}
                          </p>
                          <p className="text-xs text-theme-text-muted">获得积分</p>
                        </div>
                        <div className="bg-theme-subtle/50 rounded-lg p-3 text-center">
                          <p className="text-2xl font-bold text-climbing-orange-500">
                            {posterData.user.unlockedCount}
                          </p>
                          <p className="text-xs text-theme-text-muted">已解锁徽章</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-theme-text-muted mb-1">扫码查看详情</p>
                        <div className="flex items-center gap-2">
                          <QrCode size={14} className="text-theme-text-muted" />
                          <span className="text-xs text-theme-text-muted">
                            {posterData.user.totalPoints} 总积分
                          </span>
                        </div>
                      </div>
                      {qrDataUrl && (
                        <div className="bg-white p-2 rounded-lg">
                          <img
                            src={qrDataUrl}
                            alt="分享二维码"
                            className="w-20 h-20"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                    <div className="text-center pt-4 border-t border-theme-border">
                      <p className="text-xs text-theme-text-muted">
                        攀岩管理系统 · 记录每一次进步
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  disabled={exporting}
                  className="px-6 py-2.5 bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-600 hover:from-climbing-orange-400 hover:to-climbing-orange-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Download size={18} />
                  {exporting ? '生成中...' : '下载海报'}
                </button>
                <button
                  onClick={handleShare}
                  disabled={exporting}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Share2 size={18} />
                  分享
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
