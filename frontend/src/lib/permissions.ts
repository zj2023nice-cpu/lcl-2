import type { UserRole, Route, User, Wall } from '@/types';

const ROLE_HIERARCHY: UserRole[] = [
  'platform_admin',
  'gym_admin',
  'setter',
  'verified_climber',
  'guest',
];

export function canChangeRole(currentUser: User | null, targetRole: UserRole): boolean {
  if (!currentUser) return false;
  if (currentUser.role !== 'platform_admin' && currentUser.role !== 'gym_admin') return false;

  const currentIdx = ROLE_HIERARCHY.indexOf(currentUser.role);
  const targetIdx = ROLE_HIERARCHY.indexOf(targetRole);
  if (currentIdx < 0 || targetIdx < 0) return false;

  return currentIdx < targetIdx;
}

export function getRoleHighlight(
  currentUser: User | null,
  targetRole: UserRole,
): 'promote' | 'demote' | 'current' | 'none' {
  if (!currentUser) return 'none';
  if (currentUser.role === targetRole) return 'current';

  const currentIdx = ROLE_HIERARCHY.indexOf(currentUser.role);
  const targetIdx = ROLE_HIERARCHY.indexOf(targetRole);
  if (currentIdx < 0 || targetIdx < 0) return 'none';

  if (!canChangeRole(currentUser, targetRole)) return 'none';

  return targetIdx < currentIdx ? 'promote' : 'demote';
}

export function canEditRoute(
  user: User | null,
  route: Route | null,
  wall?: Wall | null,
): boolean {
  if (!user || !route) {
    return false;
  }

  if (user.role === 'platform_admin') {
    return true;
  }

  if (user.role === 'setter') {
    return route.setterId === user.id;
  }

  if (user.role === 'gym_admin') {
    if (!wall) {
      return false;
    }
    return wall.gymId === user.gymId;
  }

  return false;
}

export function canEditRouteText(
  user: User | null,
  route: Route | null,
  wall?: Wall | null,
): string {
  return canEditRoute(user, route, wall) ? '可以' : '不可以';
}
