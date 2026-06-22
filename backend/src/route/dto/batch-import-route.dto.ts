import { RouteType } from '../../entities/route.entity';
import { HoldType } from '../../entities/hold.entity';

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
  hold_x: string;
  hold_y: string;
  hold_type: string;
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
  hold_x: 'hold_x',
  hold_y: 'hold_y',
  hold_type: 'hold_type',
};

export const ROUTE_TYPE_VALUES: string[] = Object.values(RouteType);

export const ROUTE_HOLD_TYPE_VALUES: string[] = ['start', 'hold', 'end'];

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
  hold_x: string;
  hold_y: string;
  hold_type: string;
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
  hold_x?: number;
  hold_y?: number;
  hold_type?: HoldType;
}

export interface RouteValidationFailure {
  lineNumber: number;
  row: ParsedRouteRow;
  reasons: string[];
}

export interface RouteHoldError {
  lineNumber: number;
  reasons: string[];
}

export interface RouteBatchImportParseResult {
  totalRows: number;
  validCount: number;
  failureCount: number;
  holdCount: number;
  holdErrors: RouteHoldError[];
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
  createdHolds: number;
  createdRoutes: { id: number; name: string; grade: string; type: RouteType; wall_id: number }[];
  failures: { lineNumber: number; reason: string }[];
}
