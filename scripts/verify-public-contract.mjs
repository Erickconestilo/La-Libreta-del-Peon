import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE_URL = "https://la-libreta-del-peon-1.onrender.com/api/v1";
const PLACEHOLDER_PROJECT_ID = "00000000-0000-0000-0000-000000000000";

const readJsonBody = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

const requestJson = async (fetchImpl, url) => {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    method: "GET",
  });

  return {
    body: await readJsonBody(response),
    status: response.status,
  };
};

const assertResponse = (name, result, expectedStatus, predicate) => {
  if (result.status !== expectedStatus || !predicate(result.body)) {
    throw new Error(`${name} unexpected response: HTTP ${result.status} ${JSON.stringify(result.body)}`);
  }
};

export const verifyPublicContract = async ({
  baseUrl = DEFAULT_BASE_URL,
  roundPointId,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (typeof fetchImpl !== "function") {
    throw new Error("This verifier requires a runtime with global fetch");
  }

  const root = normalizeBaseUrl(baseUrl);
  const health = await requestJson(fetchImpl, `${root}/health`);
  assertResponse("health", health, 200, (body) => body?.status === "ok");

  const readiness = await requestJson(fetchImpl, `${root}/readiness`);
  assertResponse(
    "readiness",
    readiness,
    200,
    (body) => body?.status === "ready" && body?.capabilities?.workExecution?.available === true,
  );

  const rounds = await requestJson(
    fetchImpl,
    `${root}/projects/${PLACEHOLDER_PROJECT_ID}/rounds`,
  );
  assertResponse(
    "project rounds without bearer",
    rounds,
    401,
    (body) => body?.error?.code === "UNAUTHORIZED",
  );

  const journey = await requestJson(fetchImpl, `${root}/me/journey`);
  assertResponse(
    "personal journey without bearer",
    journey,
    401,
    (body) => body?.error?.code === "UNAUTHORIZED",
  );

  const result = { health, journey, readiness, rounds };

  if (roundPointId) {
    const executionEvents = await requestJson(
      fetchImpl,
      `${root}/round-points/${encodeURIComponent(roundPointId)}/execution-events`,
    );
    assertResponse(
      "work execution events without bearer",
      executionEvents,
      401,
      (body) => body?.error?.code === "UNAUTHORIZED",
    );
    result.executionEvents = executionEvents;
  }

  return result;
};

const isMainModule = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMainModule) {
  try {
    const baseUrl = process.env.TOPOFIELD_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL;
    const result = await verifyPublicContract({
      baseUrl,
      roundPointId: process.env.TOPOFIELD_ROUND_POINT_ID,
    });

    console.log(`PUBLIC_CONTRACT_BASE=${normalizeBaseUrl(baseUrl)}`);
    console.log(`PUBLIC_HEALTH_STATUS=${result.health.status}`);
    console.log(`PUBLIC_HEALTH_BODY=${JSON.stringify(result.health.body)}`);
    console.log(`PUBLIC_READINESS_STATUS=${result.readiness.status}`);
    console.log(`PUBLIC_READINESS_BODY=${JSON.stringify(result.readiness.body)}`);
    console.log(`PUBLIC_ROUNDS_STATUS=${result.rounds.status}`);
    console.log(`PUBLIC_ROUNDS_BODY=${JSON.stringify(result.rounds.body)}`);
    console.log(`PUBLIC_JOURNEY_STATUS=${result.journey.status}`);
    console.log(`PUBLIC_JOURNEY_BODY=${JSON.stringify(result.journey.body)}`);
    if (result.executionEvents) {
      console.log(`PUBLIC_EXECUTION_EVENTS_STATUS=${result.executionEvents.status}`);
      console.log(`PUBLIC_EXECUTION_EVENTS_BODY=${JSON.stringify(result.executionEvents.body)}`);
    }
    console.log("Public contract verification completed successfully.");
  } catch (error) {
    console.error(`Public contract verification failed: ${error?.message ?? error}`);
    process.exit(1);
  }
}
