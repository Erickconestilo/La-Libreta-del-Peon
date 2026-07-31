type Queryable = {
  query: (sql: string, params?: readonly unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

type SampleControlPoint = {
  code: string;
  environment: 'surface';
  instrumentType: 'digital_level' | 'piezometer';
  name: string;
  pk: string;
  threshold: {
    alarmValue: number;
    unit: string;
    warningValue: number;
  };
  tramo: string;
  zona: string;
};

const SAMPLE_CATALOG = [
  ['EJ-N-001', 'Zona Norte', 'blue', 1, 1, 'surface', '0+000'],
  ['EJ-N-002', 'Zona Norte', 'blue', 1, 2, 'surface', '0+050'],
  ['EJ-S-001', 'Zona Sur', 'pink', 2, 1, 'surface', '0+000'],
  ['EJ-S-002', 'Zona Sur', 'pink', 2, 2, 'surface', '0+050']
] as const;

const SAMPLE_CONTROL_POINTS: SampleControlPoint[] = [
  {
    code: 'EJ-NIV-01',
    environment: 'surface',
    instrumentType: 'digital_level',
    name: 'Ejemplo - Punto de nivel 01',
    pk: '0+000',
    threshold: { alarmValue: 10, unit: 'mm', warningValue: 5 },
    tramo: 'Itinerario de ejemplo 1',
    zona: 'Zona Norte'
  },
  {
    code: 'EJ-PIE-01',
    environment: 'surface',
    instrumentType: 'piezometer',
    name: 'Ejemplo - Punto piezometrico 01',
    pk: '0+050',
    threshold: { alarmValue: 20, unit: 'kPa', warningValue: 10 },
    tramo: 'Itinerario de ejemplo 2',
    zona: 'Zona Sur'
  }
];

const SAMPLE_NOTE = 'Datos de muestra. Revise y sustituya estos valores antes de una campana real.';

/**
 * Seeds neutral sample records so a newly created project does not start empty.
 * It must run within the caller's project creation transaction.
 */
export const seedGenericProjectTemplate = async (
  client: Queryable,
  projectId: string,
  createdBy: string
) => {
  for (const [code, zone, zoneColor, itineraryNumber, itineraryOrder, environment, pk] of SAMPLE_CATALOG) {
    await client.query(
      `
        INSERT INTO project_code_catalog (
          project_id, code, zone, zone_color, itinerary_number, itinerary_order, environment, pk
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [projectId, code, zone, zoneColor, itineraryNumber, itineraryOrder, environment, pk]
    );
  }

  for (const controlPoint of SAMPLE_CONTROL_POINTS) {
    const pointResult = await client.query(
      `
        INSERT INTO control_points (
          project_id, code, name, environment, pk, tramo, zona, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        projectId,
        controlPoint.code,
        controlPoint.name,
        controlPoint.environment,
        controlPoint.pk,
        controlPoint.tramo,
        controlPoint.zona,
        SAMPLE_NOTE
      ]
    );
    const controlPointId = pointResult.rows[0]?.id as string | undefined;

    if (!controlPointId) {
      throw new Error(`Could not seed generic control point ${controlPoint.code}`);
    }

    await client.query(
      `
        INSERT INTO control_point_thresholds (
          control_point_id, instrument_type, warning_value, alarm_value, unit, valid_from, created_by
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `,
      [
        controlPointId,
        controlPoint.instrumentType,
        controlPoint.threshold.warningValue,
        controlPoint.threshold.alarmValue,
        controlPoint.threshold.unit,
        createdBy
      ]
    );
  }
};
