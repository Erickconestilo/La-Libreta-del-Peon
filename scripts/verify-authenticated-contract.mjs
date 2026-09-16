import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://la-libreta-del-peon-1.onrender.com/api/v1";

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

const readJsonBody = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const summarizeBody = (body) => ({
  errorCode: typeof body?.error?.code === "string" ? body.error.code : null,
  dataKind: Array.isArray(body?.data) ? "array" : body?.data === null ? "null" : typeof body?.data,
  authProvider: typeof body?.data?.user?.authProvider === "string" ? body.data.user.authProvider : null,
  role: typeof body?.data?.user?.role === "string" ? body.data.user.role : null,
  status: typeof body?.status === "string" ? body.status : null,
});

const requestJson = async (fetchImpl, url, token) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchImpl(url, { headers, method: "GET" });
  const body = await readJsonBody(response);

  return {
    status: response.status,
    summary: summarizeBody(body),
  };
};

const assertAllowedStatus = (name, result, allowedStatuses) => {
  if (!allowedStatuses.includes(result.status)) {
    throw new Error(`${name} unexpected HTTP status ${result.status} (${result.summary.errorCode ?? "NO_ERROR_CODE"})`);
  }
};

const assertTechnicalAuthMe = (result) => {
  const technicalRoles = new Set(["admin", "topografo", "supervisor"]);
  if (result.summary.authProvider !== "supabase" || !technicalRoles.has(result.summary.role)) {
    throw new Error(
      `auth/me did not resolve a technical Supabase account (${result.summary.authProvider ?? "unknown"}/${result.summary.role ?? "unknown"})`,
    );
  }
};

const currentMondayIsoDate = (now = new Date()) => {
  const utcDay = now.getUTCDay();
  const daysSinceMonday = (utcDay + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
  return monday.toISOString().slice(0, 10);
};

export const verifyAuthenticatedContract = async ({
  baseUrl = DEFAULT_BASE_URL,
  token,
  projectId,
  roundId,
  roundPointId,
  weekStart,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (typeof fetchImpl !== "function") {
    throw new Error("This verifier requires a runtime with global fetch");
  }
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("TOPOFIELD_AUTH_TOKEN is required and is never printed");
  }

  const root = normalizeBaseUrl(baseUrl);
  const health = await requestJson(fetchImpl, `${root}/health`);
  assertAllowedStatus("health", health, [200]);

  const authMe = await requestJson(fetchImpl, `${root}/auth/me`, token);
  assertAllowedStatus("auth/me", authMe, [200]);
  assertTechnicalAuthMe(authMe);

  const journey = await requestJson(fetchImpl, `${root}/me/journey`, token);
  assertAllowedStatus("personal journey", journey, [200, 403]);

  const result = { authMe, health, journey };

  if (projectId) {
    const projectRounds = await requestJson(fetchImpl, `${root}/projects/${encodeURIComponent(projectId)}/rounds`, token);
    assertAllowedStatus("project rounds", projectRounds, [200, 403]);
    result.projectRounds = projectRounds;

    const weeklyWorkWeekStart = weekStart || currentMondayIsoDate();
    const weeklyWork = await requestJson(
      fetchImpl,
      `${root}/projects/${encodeURIComponent(projectId)}/weekly-work?weekStart=${encodeURIComponent(weeklyWorkWeekStart)}`,
      token,
    );
    assertAllowedStatus("weekly work", weeklyWork, [200, 403]);
    result.weeklyWork = weeklyWork;
  }

  if (roundId) {
    const round = await requestJson(fetchImpl, `${root}/rounds/${encodeURIComponent(roundId)}`, token);
    assertAllowedStatus("round detail", round, [200, 403]);
    result.round = round;
  }

  if (roundPointId) {
    const executionEvents = await requestJson(
      fetchImpl,
      `${root}/round-points/${encodeURIComponent(roundPointId)}/execution-events`,
      token,
    );
    assertAllowedStatus("work execution events", executionEvents, [200, 403]);
    result.executionEvents = executionEvents;
  }

  return result;
};

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  try {
    const baseUrl = process.env.TOPOFIELD_AUTH_API_BASE_URL
      || process.env.TOPOFIELD_PUBLIC_API_BASE_URL
      || DEFAULT_BASE_URL;
    const result = await verifyAuthenticatedContract({
      baseUrl,
      projectId: process.env.TOPOFIELD_PROJECT_ID,
      roundId: process.env.TOPOFIELD_ROUND_ID,
      roundPointId: process.env.TOPOFIELD_ROUND_POINT_ID,
      token: process.env.TOPOFIELD_AUTH_TOKEN,
      weekStart: process.env.TOPOFIELD_WEEK_START,
    });

    console.log(`AUTH_CONTRACT_BASE=${normalizeBaseUrl(baseUrl)}`);
    console.log(`AUTH_HEALTH_STATUS=${result.health.status}`);
    console.log(`AUTH_ME_STATUS=${result.authMe.status}`);
    console.log(`AUTH_ME_ERROR_CODE=${result.authMe.summary.errorCode ?? "none"}`);
    console.log(`AUTH_ME_PROVIDER=${result.authMe.summary.authProvider ?? "unknown"}`);
    console.log(`AUTH_ME_ROLE=${result.authMe.summary.role ?? "unknown"}`);
    console.log(`AUTH_JOURNEY_STATUS=${result.journey.status}`);
    console.log(`AUTH_JOURNEY_ERROR_CODE=${result.journey.summary.errorCode ?? "none"}`);
    if (result.projectRounds) {
      console.log(`AUTH_PROJECT_ROUNDS_STATUS=${result.projectRounds.status}`);
      console.log(`AUTH_PROJECT_ROUNDS_ERROR_CODE=${result.projectRounds.summary.errorCode ?? "none"}`);
    }
    if (result.weeklyWork) {
      console.log(`AUTH_WEEKLY_WORK_STATUS=${result.weeklyWork.status}`);
      console.log(`AUTH_WEEKLY_WORK_ERROR_CODE=${result.weeklyWork.summary.errorCode ?? "none"}`);
    }
    if (result.round) {
      console.log(`AUTH_ROUND_STATUS=${result.round.status}`);
      console.log(`AUTH_ROUND_ERROR_CODE=${result.round.summary.errorCode ?? "none"}`);
    }
    if (result.executionEvents) {
      console.log(`AUTH_EXECUTION_EVENTS_STATUS=${result.executionEvents.status}`);
      console.log(`AUTH_EXECUTION_EVENTS_ERROR_CODE=${result.executionEvents.summary.errorCode ?? "none"}`);
    }
    console.log("Authenticated contract verification completed successfully.");
  } catch (error) {
    console.error(`Authenticated contract verification failed: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }
}
