import { pool } from '../db/pool.js';
import { getPublicPhotoUrl } from '../lib/photo-storage.js';
import { createChangeLog } from './change-logs.model.js';
import type { CreateStationPhotoInput } from '../utils/photo-validation.js';

const mapStationPhotoRow = (row: Record<string, unknown>) => {
  return {
    id: row.id,
    isPrimary: row.is_primary,
    kind: row.kind,
    notes: row.notes,
    publicUrl: row.public_url,
    stationId: row.station_id,
    storagePath: row.storage_path,
    title: row.title,
    uploadedAt: row.uploaded_at,
    uploadedBy: row.uploaded_by
  };
};

export const listStationPhotos = async (stationId: string, limit = 50) => {
  const result = await pool.query(
    `
      SELECT
        id,
        station_id,
        storage_path,
        public_url,
        kind,
        title,
        notes,
        uploaded_by,
        uploaded_at,
        is_primary
      FROM station_photos
      WHERE station_id = $1
      ORDER BY is_primary DESC, uploaded_at DESC
      LIMIT $2
    `,
    [stationId, limit]
  );

  return result.rows.map(mapStationPhotoRow);
};

export const createStationPhoto = async (
  stationId: string,
  input: CreateStationPhotoInput,
  uploadedBy: string
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const stationResult = await client.query(
      `
        SELECT id
        FROM stations
        WHERE id = $1
        FOR UPDATE
      `,
      [stationId]
    );

    if (stationResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    if (input.isPrimary) {
      await client.query('UPDATE station_photos SET is_primary = false WHERE station_id = $1', [stationId]);
    }

    const publicUrl = getPublicPhotoUrl(input.storagePath);

    const result = await client.query(
      `
        INSERT INTO station_photos (
          station_id,
          storage_path,
          public_url,
          kind,
          title,
          notes,
          uploaded_by,
          is_primary
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          station_id,
          storage_path,
          public_url,
          kind,
          title,
          notes,
          uploaded_by,
          uploaded_at,
          is_primary
      `,
      [
        stationId,
        input.storagePath,
        publicUrl,
        input.kind,
        input.title ?? null,
        input.notes ?? null,
        uploadedBy,
        input.isPrimary
      ]
    );

    if (input.isPrimary) {
      await client.query(
        `
          UPDATE stations
          SET photo_url = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [stationId, publicUrl]
      );
    }

    await createChangeLog(
      {
        entityId: stationId,
        entityType: 'station',
        fieldChanged: 'station_photo_added',
        newValue: {
          kind: input.kind,
          title: input.title ?? null
        },
        oldValue: null
      },
      uploadedBy,
      client
    );

    await client.query('COMMIT');

    return mapStationPhotoRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteStationPhoto = async (
  stationId: string,
  stationPhotoId: string,
  changedBy: string
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `
        SELECT id, title, kind, public_url, is_primary
        FROM station_photos
        WHERE id = $1 AND station_id = $2
        FOR UPDATE
      `,
      [stationPhotoId, stationId]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query('DELETE FROM station_photos WHERE id = $1 AND station_id = $2', [stationPhotoId, stationId]);

    if (currentResult.rows[0].is_primary) {
      await client.query(
        `
          UPDATE stations
          SET photo_url = null, updated_at = NOW()
          WHERE id = $1 AND photo_url = $2
        `,
        [stationId, currentResult.rows[0].public_url]
      );
    }

    await createChangeLog(
      {
        entityId: stationId,
        entityType: 'station',
        fieldChanged: 'station_photo_deleted',
        newValue: null,
        oldValue: {
          kind: currentResult.rows[0].kind,
          title: currentResult.rows[0].title
        }
      },
      changedBy,
      client
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
