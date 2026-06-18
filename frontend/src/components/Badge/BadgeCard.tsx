import { useState } from 'react';
import {
  Mountain,
  Footprints,
  TrendingUp,
  Zap,
  Trophy,
  Target,
  Flag,
  Award,
  Crown,
  Calendar,
  Flame,
  Sunrise,
  MessageCircle,
  Heart,
  Sparkles,
  MapPin,
  Clock,
  HelpCircle,
} from 'lucide-react';
import type { UserBadge, BadgeRarity } from '@/types';

const iconMap: Record<string, any> = {
  mountain: Mountain,
  footprints: Footprints,
  'trending-up': TrendingUp,
  zap: Zap,
  trophy: Trophy,
  target: Target,
  flag: Flag,
  award: Award,
  crown: Crown,
  calendar: Calendar,
  flame: Flame,
  sunrise: Sunrise,
  'message-circle': MessageCircle,
  heart: Heart,
  sparkles: Sparkles,
  'map-pin': MapPin,
  clock: Clock,
};

const rarityConfig: Record<BadgeRarity, { label: string; bgClass: string; borderClass: string; glowClass: string }> = {
  common: {
    label: '普通',
    bgClass: 'from-green-600 to-green-800',
    borderClass: 'border-green-500/50',
    glowClass: 'shadow-green-500/30',
  },
  rare: {
    label: '稀有',
    bgClass: 'from-blue-600 to-blue-800',
    borderClass: 'border-blue-500/50',
    glowClass: 'shadow-blue-500/30',
  },
  legendary: {
    label: '传说',
    bgClass: 'from-amber-500 to-orange-600',
    borderClass: 'border-amber-400/50',
    glowClass: 'shadow-amber-500/50',
  },
};

interface BadgeCardProps {
  userBadge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showProgress?: boolean;
}

export default function BadgeCard({
  userBadge,
  size = 'md',
  onClick,
  showProgress = true,
}: BadgeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { badge, unlocked, progress } = userBadge;
  const config = badge ? rarityConfig[badge.rarity] : rarityConfig.common;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 24,
    md: 36,
    lg: 48,
  };

  const IconComponent = badge?.icon ? iconMap[badge.icon] : HelpCircle;

  return (
    <div
      className="relative flex flex-col items-center cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
          unlocked
            ? `bg-gradient-to-br ${config.bgClass} ${config.borderClass} shadow-lg ${config.glowClass} ${isHovered ? 'scale-110' : ''}`
            : 'bg-theme-card border-theme-border opacity-50'
        }`}
      >
        {unlocked && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${config.bgClass} opacity-0 ${isHovered ? 'opacity-50 animate-pulse' : ''}`}
          />
        )}
        <IconComponent
          size={iconSizes[size]}
          className={`relative z-10 ${unlocked ? 'text-white' : 'text-theme-border'}`}
        />
        {badge?.rarity === 'legendary' && unlocked && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
          </div>
        )}
      </div>

      {showProgress && !unlocked && progress > 0 && (
        <div className="w-full mt-2 px-2">
          <div className="h-1.5 bg-theme-card rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-climbing-orange-500 to-climbing-orange-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <p className="text-xs text-theme-text-muted text-center mt-1">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {badge && (
        <div className="mt-2 text-center">
          <p
            className={`text-sm font-medium ${unlocked ? 'text-theme-text' : 'text-theme-text-muted'}`}
          >
            {badge.name}
          </p>
          <p
            className={`text-xs ${unlocked ? config.borderClass.replace('border', 'text') : 'text-theme-border'}`}
          >
            {config.label}
          </p>
        </div>
      )}
    </div>
  );
}
