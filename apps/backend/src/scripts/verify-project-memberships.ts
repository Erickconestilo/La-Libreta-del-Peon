import fs from 'node:fs';
import path from 'node:path';

import { Client } from 'pg';

import { loadedEnvPath } from '../lib/load-env.js';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    message: string;
  };
};

type ProjectResponse = {
  code: string;
  id: string;
};

type StationResponse = {
  id: string;
  project?: {
    code: string;
    name: string;
  } | null;
  projectId: string | null;
};

type IncidentResponse = {
  prismId: string | null;
  stationId: string | null;
};

type StationMessageResponse = {
  station?: {
    project: {
      code: string;
      name: string;
    } | null;
  } | null;
  stationId: string;
};

const requiredEnv = ['DATABASE_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} must be defined in ${loadedEnvPath}`);
  }
}

const API_BASE_URL = process.env.TOPOFIELD_VERIFY_API_BASE_URL ?? 'https://la-libreta-del-peon-1.onrender.com/api/v1';
const DEFAULT_EMAIL = 'topofield-topografo@topofield.local';
const tokenFilePath = path.resolve(process.cwd(), '../../topofield-session-tokens.local');

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readLocalPassword = (email: string) => {
  if (!fs.existsSync(tokenFilePath)) {
    return null;
  }

  const content = fs.readFileSync(tokenFilePath, 'utf8');
  const sections = content.split(/^## /m).slice(1);

  for (const section of sections) {
    const sectionEmail = section.match(/^email=(.*)$/m)?.[1]?.trim();
    const password = section.match(/^password=(.*)$/m)?.[1]?.trim();

    if (sectionEmail?.toLowerCase() === email.toLowerCase() && password) {
      return password;
    }
  }

  return null;
};

const fetchJson = async <T>(pathOrUrl: string, init?: RequestInit) => {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({
    data: null,
    error: {
      message: 'Non JSON response'
    }
  }))) as ApiEnvelope<T>;

  return { body, response };
};

const sortStrings = (values: string[]) => [...values].sort((left, right) => left.localeCompare(right));

const assertSameSet = (actual: string[], expected: string[], label: string) => {
  const normalizedActual = sortStrings([...new Set(actual)]);
  const normalizedExpected = sortStrings([...new Set(expected)]);

  assert(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected),
    `${label} mismatch. expected=${normalizedExpected.join(',')} actual=${normalizedActual.join(',')}`
  );
};

const getToken = async (email: string, password: string) => {
  const { body, response } = await fetchJson<{
    session: {
      accessToken: string;
    };
  }>('/auth/login', {
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  assert(response.status === 200, `/auth/login expected 200, got ${response.status}: ${body.error?.code ?? ''}`);
  assert(body.data?.session?.accessToken, 'Expected access token from /auth/login');

  return body.data.session.accessToken;
};

const main = async () => {
  const email = process.env.TOPOFIELD_VERIFY_EMAIL ?? DEFAULT_EMAIL;
  const password = process.env.TOPOFIELD_VERIFY_PASSWORD ?? readLocalPassword(email);

  assert(password, `TOPOFIELD_VERIFY_PASSWORD must be set or ${tokenFilePath} must contain credentials for ${email}`);

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();

  try {
    const activeProjectsResult = await client.query<{ code: string; id: string }>(
      `
        SELECT p.id, p.code
        FROM users u
        INNER JOIN project_memberships pm ON pm.user_id = u.id AND pm.is_active = TRUE
        INNER JOIN projects p ON p.id = pm.project_id
        WHERE lower(u.email) = lower($1)
        ORDER BY p.code
      `,
      [email]
    );
    const inactiveProjectResult = await client.query<{ id: string; code: string }>(
      `
        SELECT p.id, p.code
        FROM projects p
        WHERE p.id NOT IN (
          SELECT pm.project_id
          FROM users u
          INNER JOIN project_memberships pm ON pm.user_id = u.id AND pm.is_active = TRUE
          WHERE lower(u.email) = lower($1)
        )
        ORDER BY p.code
        LIMIT 1
      `,
      [email]
    );
    const allowedStationResult = await client.query<{ id: string }>(
      `
        SELECT s.id
        FROM users u
        INNER JOIN project_memberships pm ON pm.user_id = u.id AND pm.is_active = TRUE
        INNER JOIN stations s ON s.project_id = pm.project_id
        WHERE lower(u.email) = lower($1)
      `,
      [email]
    );
    const allowedPrismResult = await client.query<{ id: string }>(
      `
        SELECT p.id
        FROM users u
        INNER JOIN project_memberships pm ON pm.user_id = u.id AND pm.is_active = TRUE
        INNER JOIN prisms p ON p.project_id = pm.project_id
        WHERE lower(u.email) = lower($1)
      `,
      [email]
    );

    const expectedProjectCodes = activeProjectsResult.rows.map((row) => row.code);
    const expectedProjectIds = new Set(activeProjectsResult.rows.map((row) => row.id));
    const allowedStationIds = new Set(allowedStationResult.rows.map((row) => row.id));
    const allowedPrismIds = new Set(allowedPrismResult.rows.map((row) => row.id));
    const token = await getToken(email, password);
    const authHeader = { Authorization: `Bearer ${token}` };

    const projects = await fetchJson<ProjectResponse[]>('/projects', { headers: authHeader });
    assert(projects.response.status === 200, `/projects expected 200, got ${projects.response.status}`);
    assertSameSet(projects.body.data.map((project) => project.code), expectedProjectCodes, '/projects scope');

    const stations = await fetchJson<StationResponse[]>('/stations', { headers: authHeader });
    assert(stations.response.status === 200, `/stations expected 200, got ${stations.response.status}`);
    for (const station of stations.body.data) {
      assert(station.projectId === null || expectedProjectIds.has(station.projectId), `Station ${station.id} is outside membership scope`);
    }

    const incidents = await fetchJson<IncidentResponse[]>('/incidents?limit=100', { headers: authHeader });
    assert(incidents.response.status === 200, `/incidents expected 200, got ${incidents.response.status}`);
    for (const incident of incidents.body.data) {
      if (incident.stationId) {
        assert(allowedStationIds.has(incident.stationId), `Incident station ${incident.stationId} is outside membership scope`);
      }

      if (incident.prismId) {
        assert(allowedPrismIds.has(incident.prismId), `Incident prism ${incident.prismId} is outside membership scope`);
      }
    }

    const messages = await fetchJson<StationMessageResponse[]>('/stations/messages?limit=100', { headers: authHeader });
    assert(messages.response.status === 200, `/stations/messages expected 200, got ${messages.response.status}`);
    for (const message of messages.body.data) {
      assert(allowedStationIds.has(message.stationId), `Message station ${message.stationId} is outside membership scope`);
      if (message.station?.project?.code) {
        assert(expectedProjectCodes.includes(message.station.project.code), `Message project ${message.station.project.code} is outside membership scope`);
      }
    }

    const changeLogs = await fetchJson<unknown[]>('/change-logs?limit=25', { headers: authHeader });
    assert(changeLogs.response.status === 200, `/change-logs expected 200, got ${changeLogs.response.status}`);

    if (inactiveProjectResult.rows[0]) {
      const inactiveProject = inactiveProjectResult.rows[0];
      const forbiddenProject = await fetchJson<ProjectResponse>(`/projects/${inactiveProject.id}`, { headers: authHeader });
      assert(
        forbiddenProject.response.status === 404,
        `/projects/${inactiveProject.code} outside scope expected 404, got ${forbiddenProject.response.status}`
      );
    }

    console.log('verify-project-memberships: ok');
    console.log(`email=${email}`);
    console.log(`activeProjects=${expectedProjectCodes.join(',')}`);
    console.log(`stations=${stations.body.data.length}`);
    console.log(`incidents=${incidents.body.data.length}`);
    console.log(`messages=${messages.body.data.length}`);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error('verify-project-memberships: failed');
  console.error(error);
  process.exit(1);
});
