import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Route } from '@/types';
import type { SortCriterion, SortField } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type BoulderGrade = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10' | 'V11' | 'V12' | 'V13' | 'V14' | 'V15' | 'V16' | 'V17';

export interface GradeColorConfig {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  fullClass: string;
}

interface GradeRangeConfig {
  min: number;
  max: number;
  config: GradeColorConfig;
}

const gradeRanges: GradeRangeConfig[] = [
  {
    min: 0, max: 2,
    config: { label: '入门', colorClass: 'text-green-400', bgClass: 'bg-green-500/20', borderClass: 'border-green-500/30', fullClass: 'bg-green-500/20 text-green-400 border-green-500/30' }
  },
  {
    min: 3, max: 5,
    config: { label: '初级', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20', borderClass: 'border-blue-500/30', fullClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  },
  {
    min: 6, max: 8,
    config: { label: '中级', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/30', fullClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  },
  {
    min: 9, max: 11,
    config: { label: '高级', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/30', fullClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
  },
  {
    min: 12, max: 14,
    config: { label: '精英', colorClass: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/30', fullClass: 'bg-red-500/20 text-red-400 border-red-500/30' }
  },
  {
    min: 15, max: 17,
    config: { label: '大师', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/30', fullClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
  },
];

const defaultGradeConfig: GradeColorConfig = {
  label: '未知',
  colorClass: 'text-gray-400',
  bgClass: 'bg-gray-500/20',
  borderClass: 'border-gray-500/30',
  fullClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const validGradeNumbers = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);

function normalizeGrade(grade: string): string {
  return grade?.toUpperCase().trim() || '';
}

function parseGradeNumber(grade: string): number | null {
  const normalized = normalizeGrade(grade);
  const match = normalized.match(/^V(\d+)$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return validGradeNumbers.has(num) ? num : null;
}

export function getGradeColorConfig(grade: string): GradeColorConfig {
  const gradeNum = parseGradeNumber(grade);
  if (gradeNum === null) return defaultGradeConfig;
  const range = gradeRanges.find(r => gradeNum >= r.min && gradeNum <= r.max);
  return range?.config || defaultGradeConfig;
}

export function getGradeLabel(grade: string): string {
  return getGradeColorConfig(grade).label;
}

export function getGradeFullClass(grade: string): string {
  return getGradeColorConfig(grade).fullClass;
}

export function isValidBoulderGrade(grade: string): grade is BoulderGrade {
  return parseGradeNumber(grade) !== null;
}

export function normalizeBoulderGrade(grade: string): BoulderGrade | null {
  const gradeNum = parseGradeNumber(grade);
  return gradeNum !== null ? (`V${gradeNum}` as BoulderGrade) : null;
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDurationWithMs(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

export function formatDurationHuman(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}小时${minutes}分${seconds}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

function getGradeNumericValue(grade: string): number {
  const match = grade?.toUpperCase().match(/^V(\d+)$/);
  if (!match) return -1;
  return parseInt(match[1], 10);
}

function compareValues<T>(a: T, b: T, direction: 'asc' | 'desc'): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return direction === 'asc' ? 1 : -1;
  if (b === null || b === undefined) return direction === 'asc' ? -1 : 1;
  if (a < b) return direction === 'asc' ? -1 : 1;
  return direction === 'asc' ? 1 : -1;
}

function getRouteFieldValue(route: Route, field: SortField): string | number | null {
  switch (field) {
    case 'grade':
      return getGradeNumericValue(route.grade);
    case 'createdAt':
      return new Date(route.createdAt).getTime();
    case 'ascentCount':
      return route.ascentCount ?? 0;
    case 'avgRating':
      return (route as unknown as { avgRating?: number }).avgRating ?? null;
    case 'setterRating':
      return (route as unknown as { setterRating?: number }).setterRating ?? null;
    default:
      return null;
  }
}

export function sortRoutes(routes: Route[], criteria: SortCriterion[]): Route[] {
  if (!criteria || criteria.length === 0) return routes;

  return [...routes].sort((a, b) => {
    for (const criterion of criteria) {
      const valueA = getRouteFieldValue(a, criterion.field);
      const valueB = getRouteFieldValue(b, criterion.field);
      const result = compareValues(valueA, valueB, criterion.direction);
      if (result !== 0) return result;
    }
    return 0;
  });
}

export function getDefaultSortCriteria(): SortCriterion[] {
  return [
    {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      field: 'createdAt',
      direction: 'desc',
    },
  ];
}
