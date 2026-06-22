import type { Route, Ascent, GradeVote, Wall } from '@/types';

export type PrintTemplateType = 'route_only' | 'full_report' | 'batch';

export interface PrintCenterProps {
  isOpen: boolean;
  onClose: () => void;
  route: Route;
  wall?: Wall | null;
  ascents?: Ascent[];
  votes?: GradeVote[];
  allRoutes?: Route[];
}

export interface PrintTemplateProps {
  route: Route;
  wall?: Wall | null;
  ascents?: Ascent[];
  votes?: GradeVote[];
  qrCodeUrl?: string;
  gymName?: string;
}

export interface BatchPrintTemplateProps {
  routes: Route[];
  wall?: Wall | null;
  qrCodeUrl?: string;
  gymName?: string;
}

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const PRINT_PADDING_MM = 15;
export const PRINT_CONTENT_WIDTH_MM = A4_WIDTH_MM - PRINT_PADDING_MM * 2;
export const PRINT_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - PRINT_PADDING_MM * 2;

export const FIRST_ASCENT_PAGE_CAPACITY = 6;
export const SUBSEQUENT_ASCENT_PAGE_CAPACITY = 10;

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getRouteShareUrl(routeId: number): string {
  return `${window.location.origin}/routes/${routeId}`;
}

export function computeFullReportPageCount(
  ascents: { id: number }[] = []
): number {
  if (ascents.length <= FIRST_ASCENT_PAGE_CAPACITY) {
    return 2;
  }
  const remaining = ascents.length - FIRST_ASCENT_PAGE_CAPACITY;
  return 2 + Math.ceil(remaining / SUBSEQUENT_ASCENT_PAGE_CAPACITY);
}

export function estimatePageCount(
  templateType: PrintTemplateType,
  route: Route,
  ascents: Ascent[] = [],
  allRoutes: Route[] = []
): number {
  switch (templateType) {
    case 'route_only':
      return 1;
    case 'full_report':
      return computeFullReportPageCount(ascents);
    case 'batch':
      return Math.ceil(allRoutes.length / 6);
    default:
      return 1;
  }
}
