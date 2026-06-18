import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { RouteStatus } from '@/types';

type BadgeStatus = 'drafting' | 'open' | 'retired';

interface RouteStatusBadgeProps {
  status: RouteStatus;
  changeReason?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<RouteStatus, BadgeStatus> = {
  drafting: 'drafting',
  open: 'open',
  removing: 'retired',
  removed: 'retired',
};

const statusConfig: Record<BadgeStatus, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  drafting: {
    label: '草稿',
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dotColor: 'bg-yellow-400',
  },
  open: {
    label: '已上线',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    dotColor: 'bg-green-400',
  },
  retired: {
    label: '已退役',
    className: 'bg-rock-dark-600/60 text-rock-light-400 border-rock-dark-500/50',
    dotColor: 'bg-rock-light-500',
  },
};

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export default function RouteStatusBadge({
  status,
  changeReason,
  className,
  size = 'sm',
}: RouteStatusBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const badgeStatus = statusMap[status];
  const config = statusConfig[badgeStatus];
  const hasReason = !!changeReason && changeReason.trim().length > 0;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200',
          sizeStyles[size],
          config.className,
          hasReason && 'cursor-help',
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
        {config.label}
      </span>

      {isHovered && hasReason && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 px-3 py-2 text-xs text-rock-light-200 bg-rock-dark-900 border border-rock-dark-600 rounded-lg shadow-xl animate-fade-in">
          <span className="block font-semibold text-rock-light-100 mb-1">变更原因</span>
          <span className="block leading-relaxed break-words">{changeReason}</span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <span className="block w-2 h-2 bg-rock-dark-900 border-r border-b border-rock-dark-600 rotate-45" />
          </span>
        </span>
      )}
    </span>
  );
}
