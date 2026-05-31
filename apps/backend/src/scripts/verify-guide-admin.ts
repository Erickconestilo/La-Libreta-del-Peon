import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';

dotenv.config({ path: loadedEnvPath });

const API_BASE_URL = process.env.API_BASE_URL_FOR_TESTS ?? 'http://127.0.0.1:3000/api/v1';

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL must be defined in ${loadedEnvPath}`);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(`SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY must be defined in ${loadedEnvPath}`);
}

const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const main = async () => {
  const email = `guide-admin-${Date.now()}@topofield.local`;
  const password = `TopoField!${Date.now()}`;
  const fullName = 'Admin temporal pruebas';
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL
  });

  let authUserId: string | null = null;
  let createdStationId: string | null = null;
  let signedPhotoPath: string | null = null;
  let testPrismId: string | null = null;

  try {
    await pgClient.connect();

    const createUserResult = await adminClient.auth.admin.createUser({
      app_metadata: {
        role: 'admin'
      },
      email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: fullName,
        role: 'admin'
      }
    });

    if (createUserResult.error || !createUserResult.data.user) {
      throw new Error(createUserResult.error?.message ?? 'Unable to create temporary auth user');
    }

    authUserId = createUserResult.data.user.id;

    await pgClient.query(
      `
        INSERT INTO users (id, email, full_name, role, is_active)
        VALUES ($1, $2, $3, 'admin', true)
        ON CONFLICT (id) DO UPDATE
        SET
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `,
      [authUserId, email, fullName]
    );

    const signInResult = await anonClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInResult.error || !signInResult.data.session?.access_token) {
      throw new Error(signInResult.error?.message ?? 'Unable to sign in temporary auth user');
    }

    const adminToken = signInResult.data.session.access_token;

    const authMeResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    assert(authMeResponse.ok, `GET /auth/me failed with status ${authMeResponse.status}`);
    const authMePayload = (await authMeResponse.json()) as {
      data?: {
        user?: {
          fullName?: string | null;
          role?: string;
        };
      };
    };

    assert(authMePayload.data?.user?.role === 'admin', 'Expected admin role from /auth/me');
    assert(authMePayload.data?.user?.fullName === fullName, 'Expected fullName from /auth/me');

    const createResponse = await fetch(`${API_BASE_URL}/guide-entries`, {
      body: JSON.stringify({
        body: 'Entrada creada desde prueba de integración',
        category: 'tests',
        title: 'Guía temporal'
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(createResponse.status === 201, `POST /guide-entries failed with status ${createResponse.status}`);
    const createPayload = (await createResponse.json()) as {
      data?: {
        id: string;
        title: string;
      };
    };

    const createdId = createPayload.data?.id;
    assert(Boolean(createdId), 'Guide entry id missing after create');

    const guestWriteResponse = await fetch(`${API_BASE_URL}/guide-entries`, {
      body: JSON.stringify({
        body: 'No debería crearse',
        category: 'tests',
        title: 'Write as guest'
      }),
      headers: {
        Authorization: `Bearer ${process.env.GUEST_PUBLIC_TOKEN ?? ''}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(
      guestWriteResponse.status === 401 || guestWriteResponse.status === 403,
      `Guest POST /guide-entries should be 401/403, got ${guestWriteResponse.status}`
    );

    const updateResponse = await fetch(`${API_BASE_URL}/guide-entries/${createdId}`, {
      body: JSON.stringify({
        title: 'Guía temporal actualizada'
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'PATCH'
    });

    assert(updateResponse.ok, `PATCH /guide-entries/:id failed with status ${updateResponse.status}`);
    const updatePayload = (await updateResponse.json()) as {
      data?: {
        title?: string;
      };
    };

    assert(updatePayload.data?.title === 'Guía temporal actualizada', 'Guide entry title was not updated');

    const deleteResponse = await fetch(`${API_BASE_URL}/guide-entries/${createdId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      method: 'DELETE'
    });

    assert(deleteResponse.ok, `DELETE /guide-entries/:id failed with status ${deleteResponse.status}`);

    const changeLogsResponse = await fetch(
      `${API_BASE_URL}/change-logs?entityType=guide_entry&entityId=${createdId}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    assert(changeLogsResponse.ok, `GET /change-logs failed with status ${changeLogsResponse.status}`);
    const changeLogsPayload = (await changeLogsResponse.json()) as {
      data?: Array<{
        entityId: string;
        entityType: string;
        fieldChanged: string;
      }>;
    };

    const guideChangeFields = new Set(changeLogsPayload.data?.map((entry) => entry.fieldChanged));
    assert(guideChangeFields.has('created'), 'Expected created guide change log');
    assert(guideChangeFields.has('title'), 'Expected title guide change log');
    assert(guideChangeFields.has('deleted'), 'Expected deleted guide change log');

    const temporaryStationName = `Estación temporal foto ${Date.now()}`;
    const createStationResponse = await fetch(`${API_BASE_URL}/stations`, {
      body: JSON.stringify({
        name: temporaryStationName,
        status: 'active'
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(createStationResponse.status === 201, `POST /stations failed with status ${createStationResponse.status}`);
    const createStationPayload = (await createStationResponse.json()) as {
      data?: {
        id: string;
      };
    };

    createdStationId = createStationPayload.data?.id ?? null;
    assert(Boolean(createdStationId), 'Station id missing after create');

    const testPrismResult = await pgClient.query<{ id: string }>(
      `
        INSERT INTO prisms (
          source_system,
          external_id,
          code,
          source_files,
          monitoring_metadata,
          created_by,
          status
        )
        VALUES ($1, $2, $3, '[]'::jsonb, '{}'::jsonb, $4, 'active')
        RETURNING id
      `,
      [
        'verify-guide-admin',
        `verify-prism-${Date.now()}`,
        `VERIFY-${Date.now()}`,
        authUserId
      ]
    );

    testPrismId = testPrismResult.rows[0].id;

    await pgClient.query(
      `
        INSERT INTO prism_observations (
          prism_id,
          station_id,
          source_system,
          external_key,
          source_file,
          source_format,
          station_code,
          raw_payload
        )
        VALUES ($1, NULL, $2, $3, $4, 'leica_txt', $5, '{}'::jsonb)
      `,
      [
        testPrismId,
        'verify-guide-admin',
        `verify-observation-${Date.now()}`,
        'verify.txt',
        temporaryStationName
      ]
    );

    const reconcileResponse = await fetch(`${API_BASE_URL}/prisms/reconcile-stations`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      method: 'POST'
    });

    assert(reconcileResponse.ok, `POST /prisms/reconcile-stations failed with status ${reconcileResponse.status}`);
    const reconcilePayload = (await reconcileResponse.json()) as {
      data?: {
        matchedObservationCount?: number;
      };
    };

    assert(
      (reconcilePayload.data?.matchedObservationCount ?? 0) >= 1,
      'Expected at least one reconciled prism observation'
    );

    const reconciledObservationResult = await pgClient.query<{ station_id: string | null }>(
      `
        SELECT station_id
        FROM prism_observations
        WHERE prism_id = $1
        LIMIT 1
      `,
      [testPrismId]
    );

    assert(
      reconciledObservationResult.rows[0]?.station_id === createdStationId,
      'Expected prism observation to be linked to created station'
    );

    const guestReconcileResponse = await fetch(`${API_BASE_URL}/prisms/reconcile-stations`, {
      headers: {
        Authorization: `Bearer ${process.env.GUEST_PUBLIC_TOKEN ?? ''}`
      },
      method: 'POST'
    });

    assert(
      guestReconcileResponse.status === 401 || guestReconcileResponse.status === 403,
      `Guest POST /prisms/reconcile-stations should be 401/403, got ${guestReconcileResponse.status}`
    );

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64'
    );

    const signPhotoResponse = await fetch(`${API_BASE_URL}/uploads/photos/sign`, {
      body: JSON.stringify({
        contentType: 'image/png',
        entityId: createdStationId,
        entityType: 'station',
        fileSizeBytes: tinyPng.byteLength
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(signPhotoResponse.status === 201, `POST /uploads/photos/sign failed with status ${signPhotoResponse.status}`);
    const signPhotoPayload = (await signPhotoResponse.json()) as {
      data?: {
        path: string;
        publicUrl: string;
        signedUrl: string;
      };
    };

    signedPhotoPath = signPhotoPayload.data?.path ?? null;
    assert(Boolean(signedPhotoPath), 'Signed photo path missing');
    assert(
      signedPhotoPath?.startsWith(`stations/${createdStationId}/`),
      'Signed photo path should be scoped to the station'
    );

    const uploadPhotoResponse = await fetch(signPhotoPayload.data?.signedUrl ?? '', {
      body: tinyPng,
      headers: {
        'cache-control': 'max-age=31536000',
        'content-type': 'image/png',
        'x-upsert': 'false'
      },
      method: 'PUT'
    });

    assert(uploadPhotoResponse.ok, `PUT signed photo upload failed with status ${uploadPhotoResponse.status}`);

    const updateStationPhotoResponse = await fetch(`${API_BASE_URL}/stations/${createdStationId}/photo`, {
      body: JSON.stringify({
        storagePath: signedPhotoPath
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'PATCH'
    });

    assert(
      updateStationPhotoResponse.ok,
      `PATCH /stations/:id/photo failed with status ${updateStationPhotoResponse.status}`
    );
    const updateStationPhotoPayload = (await updateStationPhotoResponse.json()) as {
      data?: {
        photoUrl: string | null;
      };
    };

    assert(
      updateStationPhotoPayload.data?.photoUrl === signPhotoPayload.data?.publicUrl,
      'Station photoUrl was not updated to the signed public URL'
    );

    const createStationMemoryPhotoResponse = await fetch(`${API_BASE_URL}/stations/${createdStationId}/photos`, {
      body: JSON.stringify({
        isPrimary: true,
        kind: 'reference',
        notes: 'Referencia visual creada por prueba de integración',
        storagePath: signedPhotoPath,
        title: 'Referencia temporal'
      }),
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(
      createStationMemoryPhotoResponse.status === 201,
      `POST /stations/:id/photos failed with status ${createStationMemoryPhotoResponse.status}`
    );
    const createStationMemoryPhotoPayload = (await createStationMemoryPhotoResponse.json()) as {
      data?: {
        id: string;
        isPrimary: boolean;
        kind: string;
        publicUrl: string;
      };
    };

    const createdStationPhotoId = createStationMemoryPhotoPayload.data?.id;
    assert(Boolean(createdStationPhotoId), 'Station visual memory photo id missing');
    assert(createStationMemoryPhotoPayload.data?.isPrimary === true, 'Station visual memory photo should be primary');
    assert(createStationMemoryPhotoPayload.data?.kind === 'reference', 'Station visual memory photo kind mismatch');
    assert(
      createStationMemoryPhotoPayload.data?.publicUrl === signPhotoPayload.data?.publicUrl,
      'Station visual memory publicUrl mismatch'
    );

    const listStationPhotosResponse = await fetch(`${API_BASE_URL}/stations/${createdStationId}/photos`, {
      headers: {
        Authorization: `Bearer ${process.env.GUEST_PUBLIC_TOKEN ?? ''}`
      }
    });

    assert(listStationPhotosResponse.ok, `GET /stations/:id/photos failed with status ${listStationPhotosResponse.status}`);
    const listStationPhotosPayload = (await listStationPhotosResponse.json()) as {
      data?: Array<{
        id: string;
      }>;
    };

    assert(
      listStationPhotosPayload.data?.some((photo) => photo.id === createdStationPhotoId),
      'Created station visual memory photo missing from list'
    );

    const deleteStationMemoryPhotoResponse = await fetch(
      `${API_BASE_URL}/stations/${createdStationId}/photos/${createdStationPhotoId}`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        },
        method: 'DELETE'
      }
    );

    assert(
      deleteStationMemoryPhotoResponse.ok,
      `DELETE /stations/:id/photos/:photoId failed with status ${deleteStationMemoryPhotoResponse.status}`
    );

    const stationChangeLogsResponse = await fetch(
      `${API_BASE_URL}/change-logs?entityType=station&entityId=${createdStationId}&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      }
    );

    assert(stationChangeLogsResponse.ok, `GET /change-logs station failed with status ${stationChangeLogsResponse.status}`);
    const stationChangeLogsPayload = (await stationChangeLogsResponse.json()) as {
      data?: Array<{
        fieldChanged: string;
      }>;
    };

    const stationChangeFields = new Set(stationChangeLogsPayload.data?.map((entry) => entry.fieldChanged));
    assert(stationChangeFields.has('created'), 'Expected created station change log');
    assert(stationChangeFields.has('photo_url'), 'Expected station photo_url change log');
    assert(stationChangeFields.has('station_photo_added'), 'Expected station visual memory add change log');
    assert(stationChangeFields.has('station_photo_deleted'), 'Expected station visual memory delete change log');

    const guestSignPhotoResponse = await fetch(`${API_BASE_URL}/uploads/photos/sign`, {
      body: JSON.stringify({
        contentType: 'image/jpeg',
        entityId: createdStationId,
        entityType: 'station',
        fileSizeBytes: 1024
      }),
      headers: {
        Authorization: `Bearer ${process.env.GUEST_PUBLIC_TOKEN ?? ''}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    assert(
      guestSignPhotoResponse.status === 401 || guestSignPhotoResponse.status === 403,
      `Guest POST /uploads/photos/sign should be 401/403, got ${guestSignPhotoResponse.status}`
    );

    const guestHistoryResponse = await fetch(`${API_BASE_URL}/change-logs?limit=1`, {
      headers: {
        Authorization: `Bearer ${process.env.GUEST_PUBLIC_TOKEN ?? ''}`
      }
    });

    assert(
      guestHistoryResponse.status === 401 || guestHistoryResponse.status === 403,
      `Guest GET /change-logs should be 401/403, got ${guestHistoryResponse.status}`
    );

    const listResponse = await fetch(`${API_BASE_URL}/guide-entries`);
    assert(listResponse.ok, `GET /guide-entries failed with status ${listResponse.status}`);
    const listPayload = (await listResponse.json()) as {
      data?: Array<{ id: string }>;
    };

    assert(!listPayload.data?.some((entry) => entry.id === createdId), 'Deleted guide entry still appears in list');

    console.log('verify-guide-admin: ok');
  } finally {
    if (signedPhotoPath) {
      await adminClient.storage.from('topofield-photos').remove([signedPhotoPath]).catch(() => undefined);
    }

    if (createdStationId) {
      await pgClient.query('DELETE FROM change_logs WHERE entity_id = $1', [createdStationId]).catch(() => undefined);
      await pgClient.query('DELETE FROM station_photos WHERE station_id = $1', [createdStationId]).catch(() => undefined);
      await pgClient.query('DELETE FROM station_readings WHERE station_id = $1', [createdStationId]).catch(() => undefined);
      await pgClient.query('DELETE FROM prism_observations WHERE station_id = $1', [createdStationId]).catch(() => undefined);
      await pgClient.query('DELETE FROM stations WHERE id = $1', [createdStationId]).catch(() => undefined);
    }

    if (testPrismId) {
      await pgClient.query('DELETE FROM prism_observations WHERE prism_id = $1', [testPrismId]).catch(() => undefined);
      await pgClient.query('DELETE FROM prisms WHERE id = $1', [testPrismId]).catch(() => undefined);
    }

    if (authUserId) {
      await pgClient.query('DELETE FROM change_logs WHERE changed_by = $1', [authUserId]).catch(() => undefined);
      await pgClient.query('DELETE FROM users WHERE id = $1', [authUserId]).catch(() => undefined);
      await adminClient.auth.admin.deleteUser(authUserId).catch(() => undefined);
    }

    await pgClient.end().catch(() => undefined);
  }
};

main().catch((error) => {
  console.error('verify-guide-admin: failed');
  console.error(error);
  process.exit(1);
});
