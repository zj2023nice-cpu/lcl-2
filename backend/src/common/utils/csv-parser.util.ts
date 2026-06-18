export interface CsvHeaderMap {
  position_x: string;
  position_y: string;
  type: string;
}

export interface ParsedCsvRow {
  lineNumber: number;
  position_x: string;
  position_y: string;
  type: string;
  raw: Record<string, string>;
}

export const DEFAULT_HEADER_MAP: CsvHeaderMap = {
  position_x: 'position_x',
  position_y: 'position_y',
  type: 'type',
};

export function parseCsv(content: string, headerMap: CsvHeaderMap): ParsedCsvRow[] {
  const lines = splitCsvLines(content);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const headerIndexMap: Record<keyof CsvHeaderMap, number | undefined> = {
    position_x: undefined,
    position_y: undefined,
    type: undefined,
  };

  for (const [key, csvHeader] of Object.entries(headerMap)) {
    const normalizedCsvHeader = csvHeader.trim().toLowerCase();
    const index = headers.findIndex(
      (h) => h.trim().toLowerCase() === normalizedCsvHeader
    );
    if (index !== -1) {
      headerIndexMap[key as keyof CsvHeaderMap] = index;
    }
  }

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }
    const values = parseCsvLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = values[idx] ?? '';
    });

    const row: ParsedCsvRow = {
      lineNumber: i + 1,
      position_x: headerIndexMap.position_x !== undefined
        ? values[headerIndexMap.position_x] ?? ''
        : '',
      position_y: headerIndexMap.position_y !== undefined
        ? values[headerIndexMap.position_y] ?? ''
        : '',
      type: headerIndexMap.type !== undefined
        ? values[headerIndexMap.type] ?? ''
        : '',
      raw,
    };

    rows.push(row);
  }

  return rows;
}

function splitCsvLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}
