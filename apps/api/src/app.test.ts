import request from "supertest";
import { createApp } from "./app";

// Phase 0's only test: proves the scaffold itself is wired correctly
// (Express app boots, envelope shape is correct, requestId round-trips).
// Real per-module tests (unit/integration/contract — prompt.md §238-252,
// PROGRESS.md §387) start landing with Phase 2.
describe("GET /health", () => {
  const app = createApp();

  it("returns 200 with the standard response envelope (api-spec.md §7)", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.status).toBe("ok");
    expect(res.body.meta.requestId).toBeDefined();
  });

  it("echoes a caller-supplied X-Request-Id instead of generating a new one", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "test-request-id-123");

    expect(res.headers["x-request-id"]).toBe("test-request-id-123");
    expect(res.body.meta.requestId).toBe("test-request-id-123");
  });
});

describe("Unmatched route", () => {
  it("returns 404 through the standard error envelope", async () => {
    const app = createApp();
    const res = await request(app).get("/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
