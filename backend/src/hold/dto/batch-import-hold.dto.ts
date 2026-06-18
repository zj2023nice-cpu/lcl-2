import { HoldType } from '../../entities/hold.entity';
import { CsvHeaderMap, ParsedCsvRow, DEFAULT_HEADER_MAP } from '../../common/utils/csv-parser.util';

export { CsvHeaderMap, ParsedCsvRow, DEFAULT_HEADER_MAP };

export interface ValidatedHoldRow {
  lineNumber: number;
  position_x: number;
  position_y: number;
  type: HoldType;
}

export interface ValidationFailure {
  lineNumber: number;
  reason: string;
}

export interface BatchImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  failureCount: number;
  successHolds: { id: number; position_x: number; position_y: number; type: HoldType }[];
  failures: ValidationFailure[];
}

export const HOLD_TYPE_VALUES: string[] = Object.values(HoldType);
