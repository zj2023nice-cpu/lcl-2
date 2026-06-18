import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

const gradeColorMap: Record<string, GradeColorConfig> = {
  'V0': { label: '入门', colorClass: 'text-green-400', bgClass: 'bg-green-500/20', borderClass: 'border-green-500/30', fullClass: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'V1': { label: '入门', colorClass: 'text-green-400', bgClass: 'bg-green-500/20', borderClass: 'border-green-500/30', fullClass: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'V2': { label: '入门', colorClass: 'text-green-400', bgClass: 'bg-green-500/20', borderClass: 'border-green-500/30', fullClass: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'V3': { label: '初级', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20', borderClass: 'border-blue-500/30', fullClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'V4': { label: '初级', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20', borderClass: 'border-blue-500/30', fullClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'V5': { label: '初级', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20', borderClass: 'border-blue-500/30', fullClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'V6': { label: '中级', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/30', fullClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'V7': { label: '中级', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/30', fullClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'V8': { label: '中级', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500/20', borderClass: 'border-yellow-500/30', fullClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'V9': { label: '高级', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/30', fullClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'V10': { label: '高级', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/30', fullClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'V11': { label: '高级', colorClass: 'text-orange-400', bgClass: 'bg-orange-500/20', borderClass: 'border-orange-500/30', fullClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  'V12': { label: '精英', colorClass: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/30', fullClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'V13': { label: '精英', colorClass: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/30', fullClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'V14': { label: '精英', colorClass: 'text-red-400', bgClass: 'bg-red-500/20', borderClass: 'border-red-500/30', fullClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'V15': { label: '大师', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/30', fullClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'V16': { label: '大师', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/30', fullClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'V17': { label: '大师', colorClass: 'text-purple-400', bgClass: 'bg-purple-500/20', borderClass: 'border-purple-500/30', fullClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

const defaultGradeConfig: GradeColorConfig = {
  label: '未知',
  colorClass: 'text-gray-400',
  bgClass: 'bg-gray-500/20',
  borderClass: 'border-gray-500/30',
  fullClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function getGradeColorConfig(grade: string): GradeColorConfig {
  const normalizedGrade = grade?.toUpperCase().trim() || '';
  return gradeColorMap[normalizedGrade] || defaultGradeConfig;
}

export function getGradeLabel(grade: string): string {
  return getGradeColorConfig(grade).label;
}

export function getGradeFullClass(grade: string): string {
  return getGradeColorConfig(grade).fullClass;
}

export function isValidBoulderGrade(grade: string): grade is BoulderGrade {
  return grade in gradeColorMap;
}
