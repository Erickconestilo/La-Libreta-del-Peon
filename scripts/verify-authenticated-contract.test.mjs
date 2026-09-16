import assert from "node:assert/strict";
import test from "node:test";

import { verifyAuthenticatedContract } from "./verify-authenticated-contract.mjs";

const response = (status, body) => ({
  status,
  text: async () => JSON.stringify(body),
});

test("checks the authenticated contract without printing response bodies", async () => {
  const requests = [];
  const token = "secret-token-that-must-not-leak";
  const result = await verifyAuthenticatedContract({
    baseUrl: "https://example.test/api/v1/",
    projectId: "project-a",
    roundId: "round-a",
    roundPointId: "round-point-a",
    token,
    fetchImpl: async (url, init) => {
      requests.push({ init, url });
      if (url.endsWith("/health")) return response(200, { status: "ok" });
      if (url.endsWith("/auth/me")) {
        return response(200, { data: { user: { authProvider: "supabase", role: "topografo" } } });
      }
      if (url.endsWith("/me/journey")) return response(200, { data: [] });
      if (url.includes("/projects/project-a/rounds")) return response(200, { data: [] });
      if (url.includes("/projects/project-a/weekly-work")) return response(200, { data: [] });
      if (url.includes("/round-points/round-point-a/execution-events")) return response(200, { data: [] });
      return response(200, { data: { id: "round-a" } });
    },
  });

  assert.equal(result.authMe.status, 200);
  assert.equal(result.projectRounds.status, 200);
  assert.equal(result.weeklyWork.status, 200);
  assert.equal(result.round.status, 200);
  assert.equal(result.executionEvents.status, 200);
  assert.equal(requests.length, 7);
  assert.equal(requests[0].init.headers.Authorization, undefined);
  assert.ok(requests.slice(1).every(({ init }) => init.headers.Authorization === `Bearer ${token}`));
});

test("accepts a read-only journey response but rejects a missing route", async () => {
  const result = await verifyAuthenticatedContract({
    token: "opaque-token",
    fetchImpl: async (url) => {
      if (url.endsWith("/health")) return response(200, { status: "ok" });
      if (url.endsWith("/auth/me")) {
        return response(200, { data: { user: { authProvider: "supabase", role: "supervisor" } } });
      }
      return response(403, { error: { code: "READ_ONLY_ACCESS", message: "internal detail" } });
    },
  });

  assert.equal(result.journey.status, 403);
  await assert.rejects(
    verifyAuthenticatedContract({
      token: "opaque-token",
      fetchImpl: async (url) => {
        if (url.endsWith("/health")) return response(200, { status: "ok" });
        if (url.endsWith("/auth/me")) {
          return response(200, { data: { user: { authProvider: "supabase", role: "topografo" } } });
        }
        return response(404, { error: { code: "NOT_FOUND", message: "secret internal detail" } });
      },
    }),
    (error) => {
      assert.match(error.message, /personal journey unexpected HTTP status 404/);
      assert.doesNotMatch(error.message, /secret internal detail/);
      return true;
    },
  );
});

test("rejects the guest token as authenticated technical evidence", async () => {
  await assert.rejects(
    verifyAuthenticatedContract({
      token: "guest-token",
      fetchImpl: async (url) => {
        if (url.endsWith("/health")) return response(200, { status: "ok" });
        if (url.endsWith("/auth/me")) {
          return response(200, { data: { user: { authProvider: "guest", role: "visitante" } } });
        }
        return response(403, { error: { code: "FORBIDDEN" } });
      },
    }),
    /auth\/me did not resolve a technical Supabase account \(guest\/visitante\)/,
  );
});

test("rejects a missing weekly work route when a project is supplied", async () => {
  await assert.rejects(
    verifyAuthenticatedContract({
      projectId: "project-a",
      token: "opaque-token",
      weekStart: "2026-09-14",
      fetchImpl: async (url) => {
        if (url.endsWith("/health")) return response(200, { status: "ok" });
        if (url.endsWith("/auth/me")) {
          return response(200, { data: { user: { authProvider: "supabase", role: "topografo" } } });
        }
        if (url.endsWith("/me/journey")) return response(200, { data: [] });
        if (url.includes("/projects/project-a/rounds")) return response(200, { data: [] });
        if (url.includes("/projects/project-a/weekly-work")) {
          return response(404, { error: { code: "NOT_FOUND", message: "secret internal detail" } });
        }
        return response(200, { data: [] });
      },
    }),
    (error) => {
      assert.match(error.message, /weekly work unexpected HTTP status 404/);
      assert.doesNotMatch(error.message, /secret internal detail/);
      return true;
    },
  );
});

test("fails closed without a token and does not echo it", async () => {
  await assert.rejects(
    verifyAuthenticatedContract({ token: "" }),
    (error) => {
      assert.match(error.message, /TOPOFIELD_AUTH_TOKEN is required/);
      assert.doesNotMatch(error.message, /Bearer/);
      return true;
    },
  );
});
