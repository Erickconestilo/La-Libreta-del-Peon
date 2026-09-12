import { pool } from '../db/pool.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import type {
  ValidatedCreateMountingEvidenceInput,
  ValidatedCreateMountingVisitInput,
  ValidatedUpdateMountingVisitInput
} from '../utils/mounting-validation.js';

type Scope = {
  clause: string;
  params: unknown[];
};

const MOUNTING_VISIT_TENANT_CONDITION = 's.project_id = v.project_id';

export const buildMountingVisitTenantCondition = () => MOUNTING_VISIT_TENANT_CONDITION;

type MountingEvidenceKind = 'general' | 'prism' | 'reference' | 'access' | 'other';
type MountingVisitStatus = 'draft' | 'completed' | 'blocked';

type MountingEvidence = {
  clientRequestId: string;
  id: string;
  kind: MountingEvidenceKind;
  notes: string | null;
  positionX: number | null;
  positionY: number | null;
  prismId: string | null;
  publicUrl: string;
  stationId: string;
  storagePath: string;
  title: string | null;
  uploadedAt: string;
  uploadedBy: string;
  visitId: string;
};

type MountingVisit = {
  clientRequestId: string;
  createdAt: string;
  evidence: MountingEvidence[];
  id: string;
  notes: string | null;
  projectId: string;
  recordedBy: string;
  stationId: string;
  status: MountingVisitStatus;
  updatedAt: string;
  visitedAt: string;
  changeSummary: string | null;
};

export const buildMountingVisitStationScope = (projectIds: string[] | null, baseOffset: number): Scope => {
  if (projectIds === null) {
    return { clause: '', params: [] };
  }

  if (projectIds.length === 0) {
    return { clause: 'AND 1=0', params: [] };
  }

  return {
    clause: `AND s.project_id = ANY($${baseOffset}::uuid[])`,
    params: [projectIds]
  };
};

const mapEvidenceRow = (row: Record<string, unknown>): MountingEvidence => ({
  clientRequestId: row.client_request_id as string,
  id: row.id as string,
  kind: row.kind as MountingEvidence['kind'],
  notes: row.notes as string | null,
  positionX: row.position_x as number | null,
  positionY: row.position_y as number | null,
  prismId: row.prism_id as string | null,
  publicUrl: row.public_url as string,
  stationId: row.station_id as string,
  storagePath: row.storage_path as string,
  title: row.title as string | null,
  uploadedAt: row.uploaded_at as string,
  uploadedBy: row.uploaded_by as string,
  visitId: row.visit_id as string
});

const mapVisitRow = (row: Record<string, unknown>): MountingVisit => {
  const rawEvidence = Array.isArray(row.evidence) ? row.evidence : [];

  return {
    clientRequestId: row.client_request_id as string,
    createdAt: row.created_at as string,
    evidence: rawEvidence.map((item) => mapEvidenceRow(item as Record<string, unknown>)),
    id: row.id as string,
    notes: row.notes as string | null,
    projectId: row.project_id as string,
    recordedBy: row.recorded_by as string,
    stationId: row.station_id as string,
    status: row.status as MountingVisit['status'],
    updatedAt: row.updated_at as string,
    visitedAt: row.visited_at as string,
    changeSummary: row.change_summary as string | null
  };
};

const visitSelect = `
  SELECT
    v.id,
    v.station_id,
    v.project_id,
    v.visited_at,
    v.status,
    v.notes,
    v.change_summary,
    v.recorded_by,
    v.client_request_id,
    v.created_at,
    v.updated_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id', e.id,
          'visit_id', e.visit_id,
          'station_id', e.station_id,
          'prism_id', e.prism_id,
          'kind', e.kind,
          'storage_path', e.storage_path,
          'public_url', e.public_url,
          'title', e.title,
          'notes', e.notes,
          'position_x', e.position_x,
          'position_y', e.position_y,
          'client_request_id', e.client_request_id,
          'uploaded_by', e.uploaded_by,
          'uploaded_at', e.uploaded_at
        ) ORDER BY e.uploaded_at DESC
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'::json
    ) AS evidence
  FROM station_mounting_visits v
  INNER JOIN stations s ON s.id = v.station_id AND ${MOUNTING_VISIT_TENANT_CONDITION}
  LEFT JOIN mounting_visit_evidence e ON e.visit_id = v.id
`;

export const listMountingVisits = async (stationId: string, projectScope: string[] | null = null) => {
  const scope = buildMountingVisitStationScope(projectScope, 2);
  const result = await pool.query(
    `${visitSelect}
      WHERE v.station_id = $1
      ${scope.clause}
      GROUP BY v.id
      ORDER BY v.visited_at DESC, v.created_at DESC
    `,
    [stationId, ...scope.params]
  );

  return result.rows.map(mapVisitRow);
};

export const getMountingVisitById = async (visitId: string, projectScope: string[] | null = null) => {
  const scope = buildMountingVisitStationScope(projectScope, 2);
  const result = await pool.query(
    `${visitSelect}
      WHERE v.id = $1
      ${scope.clause}
      GROUP BY v.id
      LIMIT 1
    `,
    [visitId, ...scope.params]
  );

  return result.rowCount ? mapVisitRow(result.rows[0]) : null;
};

export const createMountingVisit = async (
  stationId: string,
  input: ValidatedCreateMountingVisitInput,
  recordedBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildMountingVisitStationScope(projectScope, 2);
  const stationResult = await pool.query(
    `SELECT s.id, s.project_id FROM stations s WHERE s.id = $1 ${scope.clause}`,
    [stationId, ...scope.params]
  );

  if (!stationResult.rowCount) {
    return null;
  }

  const result = await pool.query(
    `
      INSERT INTO station_mounting_visits (
        station_id,
        project_id,
        visited_at,
        status,
        notes,
        change_summary,
        recorded_by,
        client_request_id
      )
      VALUES ($1, $2, COALESCE($3::timestamptz, NOW()), $4, $5, $6, $7, $8)
      ON CONFLICT (client_request_id) DO NOTHING
      RETURNING *
    `,
    [
      stationId,
      stationResult.rows[0].project_id,
      input.visitedAt ?? null,
      input.status,
      input.notes ?? null,
      input.changeSummary ?? null,
      recordedBy,
      input.clientRequestId
    ]
  );

  if (result.rowCount) {
    return mapVisitRow({ ...result.rows[0], evidence: [] });
  }

  const existing = await pool.query(
    `SELECT id FROM station_mounting_visits WHERE client_request_id = $1 AND station_id = $2`,
    [input.clientRequestId, stationId]
  );

  return existing.rowCount ? getMountingVisitById(existing.rows[0].id, projectScope) : null;
};

export const updateMountingVisit = async (
  visitId: string,
  routeStationId: string,
  input: ValidatedUpdateMountingVisitInput,
  projectScope: string[] | null = null
) => {
  const params: unknown[] = [visitId, routeStationId];
  const assignments: string[] = [];

  if (input.status !== undefined) {
    params.push(input.status);
    assignments.push(`v.status = $${params.length}`);
  }
  if (input.notes !== undefined) {
    params.push(input.notes);
    assignments.push(`v.notes = $${params.length}`);
  }
  if (input.changeSummary !== undefined) {
    params.push(input.changeSummary);
    assignments.push(`v.change_summary = $${params.length}`);
  }

  const scope = buildMountingVisitStationScope(projectScope, params.length + 1);
  const result = await pool.query(
    `
      UPDATE station_mounting_visits v
      SET ${assignments.join(', ')}, updated_at = NOW()
      FROM stations s
      WHERE v.id = $1
        AND v.station_id = $2
        AND s.id = v.station_id
        AND ${MOUNTING_VISIT_TENANT_CONDITION}
        ${scope.clause}
      RETURNING v.id
    `,
    [...params, ...scope.params]
  );

  return result.rowCount ? getMountingVisitById(visitId, projectScope) : null;
};

export const createMountingEvidence = async (
  visitId: string,
  routeStationId: string,
  input: ValidatedCreateMountingEvidenceInput,
  uploadedBy: string,
  projectScope: string[] | null = null
) => {
  const scope = buildMountingVisitStationScope(projectScope, 3);
  const visitResult = await pool.query(
    `
      SELECT v.id, v.station_id, s.project_id
      FROM station_mounting_visits v
      INNER JOIN stations s ON s.id = v.station_id
      WHERE v.id = $1
        AND v.station_id = $2
        AND ${MOUNTING_VISIT_TENANT_CONDITION}
        ${scope.clause}
    `,
    [visitId, routeStationId, ...scope.params]
  );

  if (!visitResult.rowCount) {
    return null;
  }

  const projectId = visitResult.rows[0].project_id as string;
  if (input.prismId) {
    const prismResult = await pool.query(
      `SELECT 1 FROM prisms WHERE id = $1 AND project_id = $2 LIMIT 1`,
      [input.prismId, projectId]
    );

    if (!prismResult.rowCount) {
      return null;
    }
  }

  const publicUrl = getPublicPhotoUrl(input.storagePath);
  const result = await pool.query(
    `
      INSERT INTO mounting_visit_evidence (
        visit_id,
        station_id,
        prism_id,
        kind,
        storage_path,
        public_url,
        title,
        notes,
        position_x,
        position_y,
        client_request_id,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (client_request_id) DO NOTHING
      RETURNING *
    `,
    [
      visitId,
      visitResult.rows[0].station_id,
      input.prismId ?? null,
      input.kind,
      input.storagePath,
      publicUrl,
      input.title ?? null,
      input.notes ?? null,
      input.positionX ?? null,
      input.positionY ?? null,
      input.clientRequestId,
      uploadedBy
    ]
  );

  if (result.rowCount) {
    return mapEvidenceRow(result.rows[0]);
  }

  const existing = await pool.query(
    `SELECT id FROM mounting_visit_evidence WHERE client_request_id = $1`,
    [input.clientRequestId]
  );

  if (!existing.rowCount) {
    return null;
  }

  const existingResult = await pool.query(
    `SELECT * FROM mounting_visit_evidence WHERE id = $1 AND visit_id = $2 AND station_id = $3`,
    [existing.rows[0].id, visitId, routeStationId]
  );

  return existingResult.rowCount ? mapEvidenceRow(existingResult.rows[0]) : null;
};
