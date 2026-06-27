type ControlPointEnvironment = 'surface' | 'tunnel' | 'other';
type ZoneColor = 'blue' | 'pink' | 'green';

type ParsedProjectCodeCatalogRow = {
  code: string;
  environment: ControlPointEnvironment | null;
  itineraryNumber: number;
  itineraryOrder: number;
  pk: string | null;
  zone: string;
  zoneColor: ZoneColor | null;
};

const REQUIRED_COLUMNS = [
  'code',
  'zone',
  'zone_color',
  'itinerary_number',
  'itinerary_order',
  'environment',
  'pk'
];

const ZONE_COLORS = new Set(['blue', 'pink', 'green']);
const ENVIRONMENTS = new Set(['surface', 'tunnel', 'other']);

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseOptionalEnvironment = (value: string, lineNumber: number): ControlPointEnvironment | null => {
  if (!value) {
    return null;
  }

  if (!ENVIRONMENTS.has(value)) {
    throw new Error(`Invalid environment "${value}" on line ${lineNumber}`);
  }

  return value as ControlPointEnvironment;
};

const parseOptionalZoneColor = (value: string, lineNumber: number): ZoneColor | null => {
  if (!value) {
    return null;
  }

  if (!ZONE_COLORS.has(value)) {
    throw new Error(`Invalid zone_color "${value}" on line ${lineNumber}`);
  }

  return value as ZoneColor;
};

const parseRequiredInteger = (value: string, column: string, lineNumber: number) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${column} "${value}" on line ${lineNumber}`);
  }

  return parsed;
};

export const parseProjectCodeCatalogCsv = (csv: string): ParsedProjectCodeCatalogRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingColumns.join(', ')}`);
  }

  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const lineNumber = index + 2;
    const get = (column: string) => values[headerIndex.get(column) ?? -1]?.trim() ?? '';
    const code = get('code');
    const zone = get('zone');

    if (!code || !zone) {
      throw new Error(`Missing code or zone on line ${lineNumber}`);
    }

    return {
      code,
      environment: parseOptionalEnvironment(get('environment'), lineNumber),
      itineraryNumber: parseRequiredInteger(get('itinerary_number'), 'itinerary_number', lineNumber),
      itineraryOrder: parseRequiredInteger(get('itinerary_order'), 'itinerary_order', lineNumber),
      pk: get('pk') || null,
      zone,
      zoneColor: parseOptionalZoneColor(get('zone_color'), lineNumber)
    };
  });

  return rows.sort((left, right) => {
    if (left.itineraryNumber !== right.itineraryNumber) {
      return left.itineraryNumber - right.itineraryNumber;
    }

    return left.itineraryOrder - right.itineraryOrder;
  });
};
