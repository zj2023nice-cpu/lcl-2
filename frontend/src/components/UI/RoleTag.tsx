import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';

const ROLE_HIERARCHY: UserRole[] = [
  'platform_admin',
  'gym_admin',
  'setter',
  'verified_climber',
  'guest',
];

export const roleLabels: Record<UserRole, string> = {
  platform_admin: '平台管理员',
  gym_admin: '岩馆管理员',
  setter: '定线员',
  verified_climber: '认证攀岩者',
  guest: '游客',
};

export const roleColors: Record<UserRole, string> = {
  platform_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  gym_admin: 'bg-green-500/20 text-green-400 border-green-500/30',
  setter: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  verified_climber: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  guest: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const roleDotColors: Record<UserRole, string> = {
  platform_admin: 'bg-red-400',
  gym_admin: 'bg-green-400',
  setter: 'bg-purple-400',
  verified_climber: 'bg-blue-400',
  guest: 'bg-gray-400',
};

export function getRoleIndex(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function getPromotableRoles(currentRole: UserRole): UserRole[] {
  const idx = getRoleIndex(currentRole);
  if (idx <= 0) return [];
  return ROLE_HIERARCHY.slice(0, idx);
}

export function getDemotableRoles(currentRole: UserRole): UserRole[] {
  const idx = getRoleIndex(currentRole);
  if (idx < 0 || idx >= ROLE_HIERARCHY.length - 1) return [];
  return ROLE_HIERARCHY.slice(idx + 1);
}

export type HighlightType = 'promote' | 'demote' | 'current' | 'none';

interface RoleTagProps {
  role: UserRole;
  highlight?: HighlightType;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const highlightStyles: Record<HighlightType, string> = {
  promote: 'ring-1 ring-green-400/60 shadow-[0_0_8px_rgba(74,222,128,0.25)]',
  demote: 'ring-1 ring-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.25)]',
  current: 'ring-1 ring-theme-text/30',
  none: '',
};

const highlightIcons: Record<HighlightType, typeof ChevronUp | null> = {
  promote: ChevronUp,
  demote: ChevronDown,
  current: Minus,
  none: null,
};

const highlightIconColors: Record<HighlightType, string> = {
  promote: 'text-green-400',
  demote: 'text-yellow-400',
  current: 'text-theme-text/50',
  none: '',
};

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export default function RoleTag({
  role,
  highlight = 'none',
  size = 'sm',
  showIcon = true,
  className,
}: RoleTagProps) {
  const HighlightIcon = showIcon ? highlightIcons[highlight] : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium transition-all duration-200',
        sizeStyles[size],
        roleColors[role],
        highlightStyles[highlight],
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', roleDotColors[role])} />
      {roleLabels[role]}
      {HighlightIcon && (
        <HighlightIcon
          size={size === 'sm' ? 10 : 12}
          className={cn('shrink-0', highlightIconColors[highlight])}
        />
      )}
    </span>
  );
}
