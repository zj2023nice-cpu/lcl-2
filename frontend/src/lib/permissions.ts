import type { UserRole, Route, User, Wall } from '@/types';

const ROLE_HIERARCHY: UserRole[] = [
  'platform_admin',
  'gym_admin',
  'setter',
  'verified_climber',
  'guest',
];

export function canPromoteRole(currentUser: User | null, targetUserRole: UserRole, newRole: UserRole): boolean {
  if (!currentUser) return false;
  if (currentUser.role !== 'platform_admin' && currentUser.role !== 'gym_admin') return false;

  const currentIdx = ROLE_HIERARCHY.indexOf(currentUser.role);
  const targetIdx = ROLE_HIERARCHY.indexOf(targetUserRole);
  const newIdx = ROLE_HIERARCHY.indexOf(newRole);
  if (currentIdx < 0 || targetIdx < 0 || newIdx < 0) return false;

  if (newIdx >= targetIdx) return false;

  return newIdx > currentIdx || currentUser.role === 'platform_admin';
}

export function canDemoteRole(currentUser: User | null, targetUserRole: UserRole, newRole: UserRole): boolean {
  if (!currentUser) return false;
  if (currentUser.role !== 'platform_admin' && currentUser.role !== 'gym_admin') return false;

  const currentIdx = ROLE_HIERARCHY.indexOf(currentUser.role);
  const targetIdx = ROLE_HIERARCHY.indexOf(targetUserRole);
  const newIdx = ROLE_HIERARCHY.indexOf(newRole);
  if (currentIdx < 0 || targetIdx < 0 || newIdx < 0) return false;

  if (newIdx <= targetIdx) return false;

  return targetIdx > currentIdx || currentUser.role === 'platform_admin';
}

export function canChangeRole(currentUser: User | null, targetUserRole: UserRole, newRole: UserRole): boolean {
  if (!currentUser) return false;
  if (targetUserRole === newRole) return false;

  return canPromoteRole(currentUser, targetUserRole, newRole) || canDemoteRole(currentUser, targetUserRole, newRole);
}

export function getRoleHighlight(
  currentUser: User | null,
  targetUserRole: UserRole,
  candidateRole: UserRole,
): 'promote' | 'demote' | 'current' | 'none' {
  if (!currentUser) return 'none';
  if (targetUserRole === candidateRole) return 'current';

  if (canPromoteRole(currentUser, targetUserRole, candidateRole)) return 'promote';
  if (canDemoteRole(currentUser, targetUserRole, candidateRole)) return 'demote';

  return 'none';
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
