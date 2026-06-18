import type { UserRole, Route, User, Wall } from '@/types';

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
