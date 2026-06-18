import { useEffect, useState } from 'react';
import { X, Trophy, Star, Sparkles, Share2 } from 'lucide-react';
import type { UserBadge, BadgeRarity } from '@/types';
import BadgeCard from './BadgeCard';
import Modal from '@/components/UI/Modal';

const rarityConfig: Record<BadgeRarity, {
  label: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  particleColor: string;
}> = {
  common: {
    label: '普通',
    bgGradient: 'from-green-600 to-green-800',
    borderColor: 'border-green-400',
    glowColor: 'shadow-green-500/50',
    particleColor: '#22C55E',
  },
  rare: {
    label: '稀有',
    bgGradient: 'from-blue-600 to-blue-800',
    borderColor: 'border-blue-400',
    glowColor: 'shadow-blue-500/50',
    particleColor: '#3B82F6',
  },
  legendary: {
    label: '传说',
    bgGradient: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-400',
    glowColor: 'shadow-amber-500/50',
    particleColor: '#F59E0B',
  },
};

interface BadgeUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: UserBadge;
  onGeneratePoster?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export default function BadgeUnlockModal({
  isOpen,
  onClose,
  badge,
  onGeneratePoster,
}: BadgeUnlockModalProps) {
  const [showContent, setShowContent] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isOpen) {
      setShowContent(false);

      const newParticles: Particle[] = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 8 + 4,
          delay: Math.random() * 0.5,
          duration: Math.random() * 1 + 0.5,
        });
      }
      setParticles(newParticles);

      const timer = setTimeout(() => setShowContent(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, badge.id]);

  const config = badge.badge ? rarityConfig[badge.badge.rarity] : rarityConfig.common;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/80 z-0" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full animate-float"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
                backgroundColor: config.particleColor,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 p-8 text-center">
          <div
            className={`mb-6 transition-all duration-700 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles size={24} className="text-yellow-400 animate-pulse" />
              <h2 className="text-3xl font-bold text-white">恭喜解锁新徽章！</h2>
              <Sparkles size={24} className="text-yellow-400 animate-pulse" />
            </div>
            <div
              className={`inline-block px-4 py-1 rounded-full text-sm font-medium border-2 ${config.borderColor} bg-gradient-to-r ${config.bgGradient} text-white`}
            >
              {config.label}徽章
            </div>
          </div>

          <div
            className={`mb-8 transition-all duration-1000 delay-300 ${
              showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            <div className="relative inline-block">
              <div
                className={`absolute -inset-8 rounded-full animate-ping opacity-30 bg-gradient-to-br ${config.bgGradient}`}
                style={{ animationDuration: '2s' }}
              />
              <div className="relative">
                <BadgeCard userBadge={badge} size="lg" showProgress={false} />
              </div>
            </div>
          </div>

          <div
            className={`mb-8 transition-all duration-700 delay-500 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h3 className="text-2xl font-bold text-white mb-2">{badge.badge?.name}</h3>
            <p className="text-rock-light-400 max-w-md mx-auto">{badge.badge?.description}</p>
          </div>

          <div
            className={`flex items-center justify-center gap-8 mb-8 transition-all duration-700 delay-700 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              <span className="text-white font-medium">+{badge.badge?.points} 积分</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={20} className="text-yellow-400" />
              <span className="text-white font-medium">{config.label}品质</span>
            </div>
          </div>

          <div
            className={`flex gap-4 justify-center transition-all duration-700 delay-900 ${
              showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {onGeneratePoster && (
              <button
                onClick={onGeneratePoster}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-purple-500/30"
              >
                <Share2 size={18} />
                生成海报
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-3 bg-rock-dark-700 hover:bg-rock-dark-600 text-white rounded-lg font-medium transition-all"
            >
              继续探索
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
