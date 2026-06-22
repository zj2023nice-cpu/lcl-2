import { RouteType } from '../../entities/route.entity';

export interface RouteCsvHeaderMap {
  name: string;
  type: string;
  grade: string;
  color: string;
  wall_id: string;
  setter_id: string;
  tags: string;
  length: string;
  open_date: string;
  planned_remove_date: string;
}

export const DEFAULT_ROUTE_HEADER_MAP: RouteCsvHeaderMap = {
  name: 'name',
  type: 'type',
  grade: 'grade',
  color: 'color',
  wall_id: 'wall_id',
  setter_id: 'setter_id',
  tags: 'tags',
  length: 'length',
  open_date: 'open_date',
  planned_remove_date: 'planned_remove_date',
};

export const ROUTE_TYPE_VALUES: string[] = Object.values(RouteType);

export const VALID_GRADE_PATTERNS = [
  /^V\d+$/i,
  /^5\.\d+[a-d]?$/,
];

export function isValidGrade(grade: string): boolean {
  return VALID_GRADE_PATTERNS.some((p) => p.test(grade.trim()));
}

export interface ParsedRouteRow {
  lineNumber: number;
  name: string;
  type: string;
  grade: string;
  color: string;
  wall_id: string;
  setter_id: string;
  tags: string;
  length: string;
  open_date: string;
  planned_remove_date: string;
  raw: Record<string, string>;
}

export interface ValidatedRouteRow {
  lineNumber: number;
  name: string;
  type: RouteType;
  grade: string;
  color?: string;
  wall_id: number;
  setter_id?: number;
  tags?: string[];
  length?: number;
  open_date?: string;
  planned_remove_date?: string;
}

export interface RouteValidationFailure {
  lineNumber: number;
  row: ParsedRouteRow;
  reasons: string[];
}

export interface RouteBatchImportParseResult {
  totalRows: number;
  validCount: number;
  failureCount: number;
  validRows: ValidatedRouteRow[];
  failures: RouteValidationFailure[];
  headers: string[];
  parsedRows: ParsedRouteRow[];
}

export interface RouteBatchImportConfirmPayload {
  wall_id: number;
  rows: ValidatedRouteRow[];
}

export interface RouteBatchImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  createdRoutes: { id: number; name: string; grade: string; type: RouteType; wall_id: number }[];
  failures: { lineNumber: number; reason: string }[];
}
