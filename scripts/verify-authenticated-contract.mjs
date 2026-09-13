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

export const verifyAuthenticatedContract = async ({
  baseUrl = DEFAULT_BASE_URL,
  token,
  projectId,
  roundId,
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

  const journey = await requestJson(fetchImpl, `${root}/me/journey`, token);
  assertAllowedStatus("personal journey", journey, [200, 403]);

  const result = { authMe, health, journey };

  if (projectId) {
    const projectRounds = await requestJson(fetchImpl, `${root}/projects/${encodeURIComponent(projectId)}/rounds`, token);
    assertAllowedStatus("project rounds", projectRounds, [200, 403]);
    result.projectRounds = projectRounds;
  }

  if (roundId) {
    const round = await requestJson(fetchImpl, `${root}/rounds/${encodeURIComponent(roundId)}`, token);
    assertAllowedStatus("round detail", round, [200, 403]);
    result.round = round;
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
      token: process.env.TOPOFIELD_AUTH_TOKEN,
    });

    console.log(`AUTH_CONTRACT_BASE=${normalizeBaseUrl(baseUrl)}`);
    console.log(`AUTH_HEALTH_STATUS=${result.health.status}`);
    console.log(`AUTH_ME_STATUS=${result.authMe.status}`);
    console.log(`AUTH_ME_ERROR_CODE=${result.authMe.summary.errorCode ?? "none"}`);
    console.log(`AUTH_JOURNEY_STATUS=${result.journey.status}`);
    console.log(`AUTH_JOURNEY_ERROR_CODE=${result.journey.summary.errorCode ?? "none"}`);
    if (result.projectRounds) {
      console.log(`AUTH_PROJECT_ROUNDS_STATUS=${result.projectRounds.status}`);
      console.log(`AUTH_PROJECT_ROUNDS_ERROR_CODE=${result.projectRounds.summary.errorCode ?? "none"}`);
    }
    if (result.round) {
      console.log(`AUTH_ROUND_STATUS=${result.round.status}`);
      console.log(`AUTH_ROUND_ERROR_CODE=${result.round.summary.errorCode ?? "none"}`);
    }
    console.log("Authenticated contract verification completed successfully.");
  } catch (error) {
    console.error(`Authenticated contract verification failed: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }
}
