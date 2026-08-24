import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';
import { AppError } from '../lib/app-error.js';
import { evaluateReadingStatus } from '../lib/monitoring-reading-evaluation.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import type {
  ValidatedCodeCatalogQuery,
  ValidatedCreateControlPointInput,
  ValidatedCreateControlPointThresholdInput,
  ValidatedCreateInstrumentReadingInput,
  ValidatedCreateReadingAttachmentInput,
  ValidatedCreateMonitoringRoundInput,
  ValidatedCreateRoundPointInput,
  ValidatedListControlPointsQuery,
  ValidatedListMonitoringRoundsQuery,
  ValidatedReadingHistoryQuery,
  ValidatedUpdateMonitoringRoundStatusInput,
  ValidatedUpdateControlPointInput
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

export const buildProjectScopeCondition = (
  projectIds: string[] | null,
  alias: string,
  offset: number,
  projectIdColumn = 'project_id',
): ProjectScope => {
  if (projectIds === null) {
    return { clause: '', params: [] };
  }

  if (projectIds.length === 0) {
    return { clause: 'AND 1=0', params: [] };
  }

  return {
    clause: `AND ${alias}.${projectIdColumn} = ANY($${offset}::uuid[])`,
    params: [projectIds]
  };
};

export const toIsoTimestamp = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
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

const mapReadingAttachmentRow = (row: Record<string, unknown>) => ({
  attachmentType: row.attachment_type,
  id: row.id,
  notes: row.notes,
  publicUrl: row.public_url,
  readingId: row.reading_id,
  storagePath: row.storage_path,
  title: row.title,
  uploadedAt: row.uploaded_at,
  uploadedBy: row.uploaded_by
});

const mapRoundRow = (row: Record<string, unknown>) => ({
  createdAt: row.created_at,
  createdBy: row.created_by,
  fieldConditions: row.field_conditions,
  id: row.id,
  instrumentSerial: row.instrument_serial,
  name: row.name,
  operatorId: row.operator_id,
  projectId: row.project_id,
  roundDate: row.round_date,
  status: row.status,
  updatedAt: row.updated_at
});

const mapRoundPointWithControlPointRow = (row: Record<string, unknown>) => ({
  ...mapRoundPointRow(row),
  controlPointCode: row.control_point_code,
  controlPointName: row.control_point_name
});

const mapControlPointRow = (row: Record<string, unknown>) => ({
  code: row.code,
  createdAt: row.created_at,
  environment: row.environment,
  id: row.id,
  isActive: row.is_active,
  name: row.name,
  notes: row.notes,
  pk: row.pk,
  projectId: row.project_id,
  seccion: row.seccion,
  side: row.side,
  tramo: row.tramo,
  updatedAt: row.updated_at,
  zona: row.zona
});

const mapThresholdRow = (row: Record<string, unknown>) => ({
  alarmValue: row.alarm_value === null || row.alarm_value === undefined ? null : Number(row.alarm_value),
  controlPointId: row.control_point_id,
  createdAt: row.created_at,
  createdBy: row.created_by,
  id: row.id,
  instrumentType: row.instrument_type,
  unit: row.unit,
  updatedAt: row.updated_at,
  validFrom: row.valid_from,
  validTo: row.valid_to,
  warningValue: row.warning_value === null || row.warning_value === undefined ? null : Number(row.warning_value)
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

const resolveControlPointContext = async (controlPointId: string, projectScope: string[] | null) => {
  const scope = buildProjectScopeCondition(projectScope, 'cp', 2);
  const result = await pool.query(
    `
      SELECT cp.id, cp.project_id
      FROM control_points cp
      WHERE cp.id = $1
      ${scope.clause}
      LIMIT 1
    `,
    [controlPointId, ...scope.params]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return {
    id: result.rows[0].id as string,
    projectId: result.rows[0].project_id as string
  };
};

export const createMonitoringRound = async (
  projectId: string,
  input: ValidatedCreateMonitoringRoundInput,
  createdBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 'p', 9, 'id');
  const result = await pool.query(
    `
      INSERT INTO monitoring_rounds (
        project_id,
        name,
        round_date,
        status,
        operator_id,
        instrument_serial,
        field_conditions,
        created_by
      )
      SELECT p.id, $2, $3::date, $4, $5, $6, $7, $8
      FROM projects p
      WHERE p.id = $1
      ${scope.clause}
      RETURNING *
    `,
    [
      projectId,
      input.name.trim(),
      input.roundDate,
      input.status,
      input.operatorId ?? null,
      input.instrumentSerial?.trim() || null,
      input.fieldConditions ?? null,
      createdBy,
      ...scope.params
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapRoundRow(result.rows[0]);
};

export const listMonitoringRounds = async (
  projectId: string,
  query: ValidatedListMonitoringRoundsQuery,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 'mr', 2);
  const params: unknown[] = [projectId, ...scope.params];
  const filters: string[] = [];

  if (query.status) {
    params.push(query.status);
    filters.push(`AND mr.status = $${params.length}`);
  }

  params.push(query.limit);
  const limitParamIndex = params.length;
  params.push(query.offset);
  const offsetParamIndex = params.length;

  const result = await pool.query(
    `
      SELECT mr.*
      FROM monitoring_rounds mr
      WHERE mr.project_id = $1
      ${scope.clause}
      ${filters.join('\n')}
      ORDER BY mr.round_date DESC, mr.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `,
    params
  );

  return result.rows.map(mapRoundRow);
};

export const getMonitoringRoundDetail = async (roundId: string, projectScope: string[] | null = null) => {
  const scope = buildRoundProjectScopeCondition(projectScope, 2);
  const roundResult = await pool.query(
    `
      SELECT mr.*
      FROM monitoring_rounds mr
      WHERE mr.id = $1
      ${scope.clause}
      LIMIT 1
    `,
    [roundId, ...scope.params]
  );

  if (roundResult.rowCount === 0) {
    return null;
  }

  const pointsResult = await pool.query(
    `
      SELECT
        mrp.*,
        cp.code AS control_point_code,
        cp.name AS control_point_name
      FROM monitoring_round_points mrp
      INNER JOIN control_points cp ON cp.id = mrp.control_point_id
      WHERE mrp.round_id = $1
      ORDER BY mrp.sort_order ASC, mrp.created_at ASC
    `,
    [roundId]
  );

  return {
    ...mapRoundRow(roundResult.rows[0]),
    points: pointsResult.rows.map(mapRoundPointWithControlPointRow)
  };
};

export const assertMonitoringRoundStatusTransition = (
  currentStatus: string,
  nextStatus: ValidatedUpdateMonitoringRoundStatusInput['status'],
  hasPendingPoints: boolean
) => {
  if (currentStatus === 'closed' || currentStatus === 'cancelled') {
    throw new AppError('A terminal round cannot be changed', 409, 'ROUND_TERMINAL');
  }

  if (nextStatus === 'active' && currentStatus !== 'draft') {
    throw new AppError('Only a draft round can be activated', 409, 'INVALID_ROUND_TRANSITION');
  }

  if (nextStatus === 'closed') {
    if (currentStatus !== 'active') {
      throw new AppError('Only an active round can be closed', 409, 'INVALID_ROUND_TRANSITION');
    }

    if (hasPendingPoints) {
      throw new AppError('The round still has pending points', 409, 'ROUND_HAS_PENDING_POINTS');
    }
  }

  if (nextStatus === 'cancelled' && currentStatus !== 'draft' && currentStatus !== 'active') {
    throw new AppError('Only a draft or active round can be cancelled', 409, 'INVALID_ROUND_TRANSITION');
  }
};

export const updateMonitoringRoundStatus = async (
  roundId: string,
  input: ValidatedUpdateMonitoringRoundStatusInput,
  projectScope: string[] | null = null
) => {
  const scope = buildRoundProjectScopeCondition(projectScope, 2);
  const currentResult = await pool.query(
    `
      SELECT mr.status
      FROM monitoring_rounds mr
      WHERE mr.id = $1
      ${scope.clause}
      LIMIT 1
    `,
    [roundId, ...scope.params]
  );

  if (currentResult.rowCount === 0) {
    return null;
  }

  let hasPendingPoints = false;

  if (input.status === 'closed') {
    const pendingResult = await pool.query(
      `
        SELECT 1
        FROM monitoring_round_points
        WHERE round_id = $1
          AND status = 'pending'
        LIMIT 1
      `,
      [roundId]
    );
    hasPendingPoints = (pendingResult.rowCount ?? 0) > 0;
  }

  assertMonitoringRoundStatusTransition(currentResult.rows[0].status, input.status, hasPendingPoints);

  const updateScope = buildRoundProjectScopeCondition(projectScope, 3);
  const result = await pool.query(
    `
      UPDATE monitoring_rounds mr
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      ${updateScope.clause}
      RETURNING *
    `,
    [roundId, input.status, ...updateScope.params]
  );

  return result.rowCount === 0 ? null : mapRoundRow(result.rows[0]);
};

export const createControlPoint = async (
  projectId: string,
  input: ValidatedCreateControlPointInput,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 'p', 11, 'id');
  const result = await pool.query(
    `
      INSERT INTO control_points (
        project_id,
        code,
        name,
        environment,
        pk,
        tramo,
        zona,
        seccion,
        side,
        notes
      )
      SELECT p.id, $2, $3, $4, $5, $6, $7, $8, $9, $10
      FROM projects p
      WHERE p.id = $1
      ${scope.clause}
      RETURNING *
    `,
    [
      projectId,
      input.code.trim(),
      input.name?.trim() || null,
      input.environment,
      input.pk?.trim() || null,
      input.tramo?.trim() || null,
      input.zona?.trim() || null,
      input.seccion?.trim() || null,
      input.side ?? null,
      input.notes?.trim() || null,
      ...scope.params
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapControlPointRow(result.rows[0]);
};

export const listControlPoints = async (
  projectId: string,
  query: ValidatedListControlPointsQuery,
  projectScope: string[] | null = null
) => {
  const scope = buildProjectScopeCondition(projectScope, 'cp', 2);
  const params: unknown[] = [projectId, ...scope.params];
  const filters: string[] = [];

  if (query.isActive !== undefined) {
    params.push(query.isActive);
    filters.push(`AND cp.is_active = $${params.length}`);
  }

  const result = await pool.query(
    `
      SELECT cp.*
      FROM control_points cp
      WHERE cp.project_id = $1
      ${scope.clause}
      ${filters.join('\n')}
      ORDER BY cp.code ASC
    `,
    params
  );

  return result.rows.map(mapControlPointRow);
};

export const updateControlPoint = async (
  controlPointId: string,
  input: ValidatedUpdateControlPointInput,
  projectScope: string[] | null = null
) => {
  const setClauses: string[] = [];
  const params: unknown[] = [controlPointId];

  const fieldMap: Array<[keyof ValidatedUpdateControlPointInput, string]> = [
    ['environment', 'environment'],
    ['isActive', 'is_active'],
    ['name', 'name'],
    ['notes', 'notes'],
    ['pk', 'pk'],
    ['seccion', 'seccion'],
    ['side', 'side'],
    ['tramo', 'tramo'],
    ['zona', 'zona']
  ];

  for (const [inputKey, column] of fieldMap) {
    if (input[inputKey] !== undefined) {
      params.push(input[inputKey]);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No fields to update', 400, 'NO_FIELDS_TO_UPDATE');
  }

  const scope = buildProjectScopeCondition(projectScope, 'cp', params.length + 1);
  params.push(...scope.params);

  const result = await pool.query(
    `
      UPDATE control_points cp
      SET ${setClauses.join(', ')}, updated_at = NOW()
      WHERE cp.id = $1
      ${scope.clause}
      RETURNING cp.*
    `,
    params
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapControlPointRow(result.rows[0]);
};

export const createControlPointThreshold = async (
  controlPointId: string,
  input: ValidatedCreateControlPointThresholdInput,
  createdBy: string,
  projectScope: string[] | null = null
) => {
  const context = await resolveControlPointContext(controlPointId, projectScope);

  if (!context) {
    return null;
  }

  const result = await pool.query(
    `
      INSERT INTO control_point_thresholds (
        control_point_id,
        instrument_type,
        warning_value,
        alarm_value,
        unit,
        valid_from,
        valid_to,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8)
      RETURNING *
    `,
    [
      controlPointId,
      input.instrumentType,
      input.warningValue ?? null,
      input.alarmValue ?? null,
      input.unit.trim(),
      input.validFrom,
      input.validTo ?? null,
      createdBy
    ]
  );

  return mapThresholdRow(result.rows[0]);
};

export const listControlPointThresholds = async (controlPointId: string, projectScope: string[] | null = null) => {
  const context = await resolveControlPointContext(controlPointId, projectScope);

  if (!context) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT *
      FROM control_point_thresholds
      WHERE control_point_id = $1
      ORDER BY valid_from DESC
    `,
    [controlPointId]
  );

  return result.rows.map(mapThresholdRow);
};

export const getReadingHistory = async (
  controlPointId: string,
  query: ValidatedReadingHistoryQuery,
  projectScope: string[] | null = null
) => {
  const context = await resolveControlPointContext(controlPointId, projectScope);

  if (!context) {
    return null;
  }

  const params: unknown[] = [controlPointId];
  const filters: string[] = [];

  if (query.instrumentType) {
    params.push(query.instrumentType);
    filters.push(`AND instrument_type = $${params.length}`);
  }

  params.push(query.limit);
  const limitParamIndex = params.length;
  params.push(query.offset);
  const offsetParamIndex = params.length;

  const result = await pool.query(
    `
      SELECT *
      FROM instrument_readings
      WHERE control_point_id = $1
      ${filters.join('\n')}
      ORDER BY measured_at DESC, created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `,
    params
  );

  return result.rows.map(mapReadingRow);
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

      const existingMeasuredAt = toIsoTimestamp(existingReading.measuredAt);
      const threshold = await getApplicableThreshold(
        client,
        context.controlPointId,
        context.expectedInstrumentType,
        existingMeasuredAt
      );
      const previousValue = await getPreviousConfirmedValue(
        client,
        context.controlPointId,
        context.expectedInstrumentType,
        existingMeasuredAt,
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

export const getInstrumentReadingById = async (readingId: string, projectScope: string[] | null = null) => {
  const scope = buildRoundProjectScopeCondition(projectScope, 2);
  const result = await pool.query(
    `
      SELECT ir.*
      FROM instrument_readings ir
      INNER JOIN monitoring_round_points mrp ON mrp.id = ir.round_point_id
      INNER JOIN monitoring_rounds mr ON mr.id = mrp.round_id
      WHERE ir.id = $1
      ${scope.clause}
      LIMIT 1
    `,
    [readingId, ...scope.params]
  );

  return result.rowCount === 0 ? null : mapReadingRow(result.rows[0]);
};

export const createReadingAttachment = async (
  roundPointId: string,
  readingId: string,
  input: ValidatedCreateReadingAttachmentInput,
  uploadedBy: string,
  projectScope: string[] | null = null
) => {
  const client = await pool.connect();
  const scope = buildRoundProjectScopeCondition(projectScope, 3);

  try {
    await client.query('BEGIN');

    const readingResult = await client.query(
      `
        SELECT ir.id
        FROM instrument_readings ir
        INNER JOIN monitoring_round_points mrp ON mrp.id = ir.round_point_id
        INNER JOIN monitoring_rounds mr ON mr.id = mrp.round_id
        WHERE ir.id = $1
          AND ir.round_point_id = $2
        ${scope.clause}
        FOR UPDATE
      `,
      [readingId, roundPointId, ...scope.params]
    );

    if (readingResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const existingResult = await client.query(
      `
        SELECT *
        FROM reading_attachments
        WHERE reading_id = $1
          AND storage_path = $2
        LIMIT 1
      `,
      [readingId, input.storagePath]
    );

    if (existingResult.rows.length > 0) {
      await client.query('COMMIT');
      return mapReadingAttachmentRow(existingResult.rows[0]);
    }

    const result = await client.query(
      `
        INSERT INTO reading_attachments (
          reading_id,
          storage_path,
          public_url,
          attachment_type,
          title,
          notes,
          uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        readingId,
        input.storagePath,
        getPublicPhotoUrl(input.storagePath),
        input.attachmentType,
        input.title ?? null,
        input.notes ?? null,
        uploadedBy
      ]
    );

    await client.query('COMMIT');
    return mapReadingAttachmentRow(result.rows[0]);
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
