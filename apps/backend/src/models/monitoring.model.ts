import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import { evaluateReadingStatus } from '../lib/monitoring-reading-evaluation.js';
import type {
  ValidatedCodeCatalogQuery,
  ValidatedCreateInstrumentReadingInput,
  ValidatedCreateRoundPointInput
} from '../utils/monitoring-validation.js';

type ProjectScope = {
  clause: string;
  params: unknown[];
};

const buildRoundProjectScopeCondition = (projectIds: string[] | null, offset: number): ProjectScope => {
  if (projectIds === null) {
    return { clause: '', params: [] };
  }

  if (projectIds.length === 0) {
    return { clause: 'AND 1=0', params: [] };
  }

  return {
    clause: `AND mr.project_id = ANY($${offset}::uuid[])`,
    params: [projectIds]
  };
};

const buildProjectScopeCondition = (projectIds: string[] | null, alias: string, offset: number): ProjectScope => {
  if (projectIds === null) {
    return { clause: '', params: [] };
  }

  if (projectIds.length === 0) {
    return { clause: 'AND 1=0', params: [] };
  }

  return {
    clause: `AND ${alias}.project_id = ANY($${offset}::uuid[])`,
    params: [projectIds]
  };
};

const mapRoundPointRow = (row: Record<string, unknown>) => ({
  controlPointId: row.control_point_id,
  createdAt: row.created_at,
  expectedInstrumentType: row.expected_instrument_type,
  id: row.id,
  notes: row.notes,
  roundId: row.round_id,
  sortOrder: row.sort_order,
  status: row.status,
  updatedAt: row.updated_at
});

const mapReadingRow = (row: Record<string, unknown>) => ({
  clientRequestId: row.client_request_id,
  controlPointId: row.control_point_id,
  createdAt: row.created_at,
  id: row.id,
  instrumentType: row.instrument_type,
  measuredAt: row.measured_at,
  measuredBy: row.measured_by,
  notes: row.notes,
  rawPayload: row.raw_payload,
  readingStatus: row.reading_status,
  roundPointId: row.round_point_id,
  unit: row.unit,
  updatedAt: row.updated_at,
  valueNumeric: row.value_numeric,
  valueText: row.value_text
});

const mapCodeCatalogRow = (row: Record<string, unknown>) => ({
  code: row.code,
  createdAt: row.created_at,
  environment: row.environment,
  id: row.id,
  isActive: row.is_active,
  itineraryNumber: row.itinerary_number,
  itineraryOrder: row.itinerary_order,
  pk: row.pk,
  projectId: row.project_id,
  zone: row.zone,
  zoneColor: row.zone_color
});

const getAutoConfirmGreen = async (client: PoolClient, projectId: string) => {
  const result = await client.query(
    `
      SELECT value
      FROM project_rules
      WHERE project_id = $1
        AND rule_type = 'auto_confirm_green'
      LIMIT 1
    `,
    [projectId]
  );

  if (result.rowCount === 0) {
    return true;
  }

  return String(result.rows[0].value).trim().toLowerCase() !== 'false';
};

const getApplicableThreshold = async (
  client: PoolClient,
  controlPointId: string,
  instrumentType: string,
  measuredAt: string
) => {
  const result = await client.query(
    `
      SELECT warning_value, alarm_value
      FROM control_point_thresholds
      WHERE control_point_id = $1
        AND instrument_type = $2
        AND valid_from <= $3::timestamptz
        AND (valid_to IS NULL OR valid_to > $3::timestamptz)
      ORDER BY valid_from DESC
      LIMIT 1
    `,
    [controlPointId, instrumentType, measuredAt]
  );

  if (result.rowCount === 0) {
    return {
      alarmValue: null,
      warningValue: null
    };
  }

  return {
    alarmValue: result.rows[0].alarm_value === null ? null : Number(result.rows[0].alarm_value),
    warningValue: result.rows[0].warning_value === null ? null : Number(result.rows[0].warning_value)
  };
};

const getPreviousConfirmedValue = async (
  client: PoolClient,
  controlPointId: string,
  instrumentType: string,
  measuredBefore: string,
  excludeReadingId: string | null = null
) => {
  const params: unknown[] = [controlPointId, instrumentType, measuredBefore];
  const excludeClause = excludeReadingId ? 'AND id <> $4' : '';

  if (excludeReadingId) {
    params.push(excludeReadingId);
  }

  const result = await client.query(
    `
      SELECT value_numeric
      FROM instrument_readings
      WHERE control_point_id = $1
        AND instrument_type = $2
        AND reading_status IN ('confirmed', 'reviewed')
        AND measured_at < $3::timestamptz
        ${excludeClause}
      ORDER BY measured_at DESC
      LIMIT 1
    `,
    params
  );

  if (result.rowCount === 0 || result.rows[0].value_numeric === null) {
    return null;
  }

  return Number(result.rows[0].value_numeric);
};

const getRoundPointContext = async (
  client: PoolClient,
  roundPointId: string,
  projectScope: string[] | null
) => {
  const scope = buildRoundProjectScopeCondition(projectScope, 2);
  const result = await client.query(
    `
      SELECT
        mrp.id,
        mrp.control_point_id,
        mrp.expected_instrument_type,
        mr.project_id
      FROM monitoring_round_points mrp
      INNER JOIN monitoring_rounds mr ON mr.id = mrp.round_id
      WHERE mrp.id = $1
      ${scope.clause}
      LIMIT 1
    `,
    [roundPointId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    controlPointId: result.rows[0].control_point_id as string,
    expectedInstrumentType: result.rows[0].expected_instrument_type as string,
    projectId: result.rows[0].project_id as string
  };
};

export const createMonitoringRoundPoint = async (
  roundId: string,
  input: ValidatedCreateRoundPointInput,
  projectScope: string[] | null = null
) => {
  const scope = buildRoundProjectScopeCondition(projectScope, 7);
  const result = await pool.query(
    `
      INSERT INTO monitoring_round_points (
        round_id,
        control_point_id,
        expected_instrument_type,
        status,
        sort_order,
        notes
      )
      SELECT
        mr.id,
        cp.id,
        $2,
        $3,
        $4,
        $5
      FROM monitoring_rounds mr
      INNER JOIN control_points cp
        ON cp.id = $1
       AND cp.project_id = mr.project_id
      WHERE mr.id = $6
      ${scope.clause}
      RETURNING
        id,
        round_id,
        control_point_id,
        expected_instrument_type,
        status,
        sort_order,
        notes,
        created_at,
        updated_at
    `,
    [
      input.controlPointId,
      input.expectedInstrumentType,
      input.status,
      input.sortOrder ?? 0,
      input.notes ?? null,
      roundId,
      ...scope.params
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRoundPointRow(result.rows[0]);
};

export const createInstrumentReading = async (
  roundPointId: string,
  input: ValidatedCreateInstrumentReadingInput,
  measuredBy: string,
  projectScope: string[] | null = null
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `
        SELECT *
        FROM instrument_readings
        WHERE measured_by = $1
          AND client_request_id = $2
        LIMIT 1
      `,
      [measuredBy, input.clientRequestId]
    );

    if (existingResult.rows.length > 0) {
      const existingReading = mapReadingRow(existingResult.rows[0]);

      if (existingReading.roundPointId !== roundPointId) {
        throw new AppError('Client request id already used for another reading', 409, 'CLIENT_REQUEST_ID_CONFLICT');
      }

      const context = await getRoundPointContext(client, roundPointId, projectScope);

      if (!context) {
        await client.query('ROLLBACK');
        return null;
      }

      const threshold = await getApplicableThreshold(
        client,
        context.controlPointId,
        context.expectedInstrumentType,
        String(existingReading.measuredAt)
      );
      const previousValue = await getPreviousConfirmedValue(
        client,
        context.controlPointId,
        context.expectedInstrumentType,
        String(existingReading.measuredAt),
        String(existingReading.id)
      );
      const autoConfirmGreen = await getAutoConfirmGreen(client, context.projectId);
      const evaluation = evaluateReadingStatus({
        alarmValue: threshold.alarmValue,
        autoConfirmGreen,
        previousValue,
        valueNumeric: existingReading.valueNumeric === null ? null : Number(existingReading.valueNumeric),
        warningValue: threshold.warningValue
      });

      await client.query('COMMIT');

      return {
        autoConfirmed: existingReading.readingStatus === 'confirmed' && evaluation.thresholdStatus === 'normal',
        created: false,
        delta: evaluation.delta,
        reading: existingReading,
        thresholdStatus: evaluation.thresholdStatus
      };
    }

    const context = await getRoundPointContext(client, roundPointId, projectScope);

    if (!context) {
      await client.query('ROLLBACK');
      return null;
    }

    const threshold = await getApplicableThreshold(
      client,
      context.controlPointId,
      context.expectedInstrumentType,
      input.measuredAt
    );
    const previousValue = await getPreviousConfirmedValue(
      client,
      context.controlPointId,
      context.expectedInstrumentType,
      input.measuredAt
    );
    const autoConfirmGreen = await getAutoConfirmGreen(client, context.projectId);
    const evaluation = evaluateReadingStatus({
      alarmValue: threshold.alarmValue,
      autoConfirmGreen,
      previousValue,
      valueNumeric: input.valueNumeric ?? null,
      warningValue: threshold.warningValue
    });

    const insertResult = await client.query(
      `
        INSERT INTO instrument_readings (
          round_point_id,
          control_point_id,
          instrument_type,
          reading_status,
          client_request_id,
          value_numeric,
          value_text,
          unit,
          measured_at,
          measured_by,
          notes,
          raw_payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10, $11, $12
        )
        RETURNING *
      `,
      [
        roundPointId,
        context.controlPointId,
        context.expectedInstrumentType,
        evaluation.readingStatus,
        input.clientRequestId,
        input.valueNumeric ?? null,
        input.valueText ?? null,
        input.unit ?? null,
        input.measuredAt,
        measuredBy,
        input.notes ?? null,
        input.rawPayload ?? null
      ]
    );

    if (evaluation.readingStatus === 'confirmed') {
      await client.query(
        `
          UPDATE monitoring_round_points
          SET status = 'taken', updated_at = NOW()
          WHERE id = $1
        `,
        [roundPointId]
      );
    }

    await client.query('COMMIT');

    return {
      autoConfirmed: evaluation.autoConfirmed,
      created: true,
      delta: evaluation.delta,
      reading: mapReadingRow(insertResult.rows[0]),
      thresholdStatus: evaluation.thresholdStatus
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listProjectCodeCatalog = async (
  projectId: string,
  query: ValidatedCodeCatalogQuery,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 'pcc', 2);
  const params: unknown[] = [projectId, ...scope.params];
  const filters: string[] = [];

  if (query.zoneColor) {
    params.push(query.zoneColor);
    filters.push(`AND pcc.zone_color = $${params.length}`);
  }

  if (query.itineraryNumber) {
    params.push(query.itineraryNumber);
    filters.push(`AND pcc.itinerary_number = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT
        pcc.id,
        pcc.project_id,
        pcc.code,
        pcc.zone,
        pcc.zone_color,
        pcc.itinerary_number,
        pcc.itinerary_order,
        pcc.environment,
        pcc.pk,
        pcc.is_active,
        pcc.created_at
      FROM project_code_catalog pcc
      WHERE pcc.project_id = $1
        AND pcc.is_active = TRUE
        ${scope.clause}
        ${filters.join('\n')}
      ORDER BY pcc.itinerary_number ASC, pcc.itinerary_order ASC, pcc.code ASC
    `,
    params
  );

  return result.rows.map(mapCodeCatalogRow);
};

export const importProjectCodeCatalog = async (
  projectId: string,
  rows: Array<{
    code: string;
    environment: string | null;
    itineraryNumber: number;
    itineraryOrder: number;
    pk: string | null;
    zone: string;
    zoneColor: string | null;
  }>
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const projectResult = await client.query('SELECT 1 FROM projects WHERE id = $1 LIMIT 1', [projectId]);

    if (projectResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    for (const row of rows) {
      await client.query(
        `
          INSERT INTO project_code_catalog (
            project_id,
            code,
            zone,
            zone_color,
            itinerary_number,
            itinerary_order,
            environment,
            pk,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
          ON CONFLICT (project_id, code) DO UPDATE
          SET
            zone = EXCLUDED.zone,
            zone_color = EXCLUDED.zone_color,
            itinerary_number = EXCLUDED.itinerary_number,
            itinerary_order = EXCLUDED.itinerary_order,
            environment = EXCLUDED.environment,
            pk = EXCLUDED.pk,
            is_active = TRUE
        `,
        [
          projectId,
          row.code,
          row.zone,
          row.zoneColor,
          row.itineraryNumber,
          row.itineraryOrder,
          row.environment,
          row.pk
        ]
      );
    }

    await client.query('COMMIT');

    return {
      imported: rows.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
