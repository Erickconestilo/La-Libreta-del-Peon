import assert from "node:assert/strict";
import test from "node:test";

import { verifyPublicContract } from "./verify-public-contract.mjs";

const response = (status, body) => ({
  status,
  text: async () => JSON.stringify(body),
});

test("accepts the expected public health and protected responses", async () => {
  const requests = [];
  const result = await verifyPublicContract({
    baseUrl: "https://example.test/api/v1/",
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      if (url.endsWith("/health")) return response(200, { commit: "test", status: "ok" });
      if (url.endsWith("/readiness")) {
        return response(200, {
          status: "ready",
          workExecution: { available: true },
        });
      }
      return response(401, {
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    },
  });

  assert.equal(result.health.status, 200);
  assert.equal(result.readiness.status, 200);
  assert.equal(result.rounds.status, 401);
  assert.equal(result.journey.status, 401);
  assert.equal(requests.length, 4);
  assert.ok(requests.every(({ init }) => init.headers.Accept === "application/json"));
  assert.ok(requests.every(({ init }) => !("Authorization" in init.headers)));
});

test("checks the work execution route when a round point is supplied", async () => {
  const requests = [];
  const result = await verifyPublicContract({
    baseUrl: "https://example.test/api/v1",
    roundPointId: "round-point-a",
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      if (url.endsWith("/health")) return response(200, { status: "ok" });
      if (url.endsWith("/readiness")) {
        return response(200, { status: "ready", workExecution: { available: true } });
      }
      return response(401, { error: { code: "UNAUTHORIZED" } });
    },
  });

  assert.equal(result.executionEvents.status, 401);
  assert.ok(requests.some(({ url }) => url.endsWith("/round-points/round-point-a/execution-events")));
  assert.ok(requests.every(({ init }) => !("Authorization" in init.headers)));
});

test("fails closed if a protected endpoint regresses to 404", async () => {
  await assert.rejects(
    verifyPublicContract({
      fetchImpl: async (url) => {
        if (url.endsWith("/health")) return response(200, { status: "ok" });
        if (url.endsWith("/readiness")) {
          return response(200, { status: "ready", workExecution: { available: true } });
        }
        return response(404, { error: { code: "NOT_FOUND" } });
      },
    }),
    /project rounds without bearer unexpected response: HTTP 404/,
  );
});

test("never sends credentials to the public contract verifier", async () => {
  const requests = [];
  await verifyPublicContract({
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      if (url.endsWith("/health")) return response(200, { status: "ok" });
      if (url.endsWith("/readiness")) {
        return response(200, { status: "ready", workExecution: { available: true } });
      }
      return response(401, { error: { code: "UNAUTHORIZED" } });
    },
  });

  assert.ok(requests.every(({ init }) => Object.keys(init.headers).every((key) => key !== "Authorization")));
});

test("fails closed when work execution readiness is unavailable", async () => {
  await assert.rejects(
    verifyPublicContract({
      fetchImpl: async (url) => {
        if (url.endsWith("/health")) return response(200, { status: "ok" });
        if (url.endsWith("/readiness")) {
          return response(503, {
            status: "not_ready",
            workExecution: { available: false, reason: "migration_missing" },
          });
        }
        return response(401, { error: { code: "UNAUTHORIZED" } });
      },
    }),
    /readiness unexpected response: HTTP 503/,
  );
});
