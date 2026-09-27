import express from "express";
import request from "supertest";
import { createSimpleMasterDataRouter } from "./simple-master-data.router-factory";
import { SimpleMasterDataUseCases } from "../application/simple-master-data.use-cases";
import { DuplicateKeyError, SimpleMasterDataNotFoundError, EntityInUseError } from "../domain/simple-master-data.types";
import { requestIdMiddleware } from "../../../shared/http";
import { errorHandler, notFoundHandler } from "../../../shared/errors/handler";
import type { AccessTokenPayload } from "../../identity/domain/auth-types";

import type { SimpleMasterDataRecord } from "../domain/simple-master-data.types";

const superAdminUser: AccessTokenPayload = {
  sub: "user_1", roleId: "role_sa", roleName: "SUPER_ADMIN", branchId: null, isSuperAdmin: true, permissions: ["*"],
};

type CategoryRecord = SimpleMasterDataRecord;

function makeApp(useCases: SimpleMasterDataUseCases<CategoryRecord>) {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  // Skip real JWT verification for this test — inject req.user directly,
  // same shortcut identity.router.test.ts takes for the parts of the stack
  // this test isn't responsible for covering.
  app.use((req, _res, next) => {
    req.user = superAdminUser;
    next();
  });
  app.use(createSimpleMasterDataRouter(useCases, { path: "categories", requiresCode: false, managePermission: "masterData.manage", viewPermission: "masterData.view" }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

function makeUseCases(overrides: Partial<jest.Mocked<SimpleMasterDataUseCases<CategoryRecord>>> = {}): jest.Mocked<SimpleMasterDataUseCases<CategoryRecord>> {
  return {
    create: jest.fn().mockResolvedValue({ id: "cat_1", name: "CCTV Cameras", isActive: true }),
    get: jest.fn().mockResolvedValue({ id: "cat_1", name: "CCTV Cameras", isActive: true }),
    list: jest.fn().mockResolvedValue({ items: [{ id: "cat_1", name: "CCTV Cameras", isActive: true }], total: 1 }),
    update: jest.fn().mockResolvedValue({ id: "cat_1", name: "Updated", isActive: true }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<SimpleMasterDataUseCases<CategoryRecord>>;
}

describe("POST /categories", () => {
  it("returns 201 on success", async () => {
    const useCases = makeUseCases();
    const res = await request(makeApp(useCases)).post("/categories").send({ name: "CCTV Cameras" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("CCTV Cameras");
  });

  it("returns 422 when name is missing", async () => {
    const useCases = makeUseCases();
    const res = await request(makeApp(useCases)).post("/categories").send({});
    expect(res.status).toBe(422);
    expect(useCases.create).not.toHaveBeenCalled();
  });

  it("returns 409 on a duplicate name", async () => {
    const useCases = makeUseCases({ create: jest.fn().mockRejectedValue(new DuplicateKeyError("category", "CCTV Cameras")) });
    const res = await request(makeApp(useCases)).post("/categories").send({ name: "CCTV Cameras" });
    expect(res.status).toBe(409);
  });
});

describe("GET /categories/:id", () => {
  it("returns 404 for a missing record", async () => {
    const useCases = makeUseCases({ get: jest.fn().mockRejectedValue(new SimpleMasterDataNotFoundError("category")) });
    const res = await request(makeApp(useCases)).get("/categories/missing");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /categories/:id", () => {
  it("returns 422 (not 500) when the category is still referenced elsewhere", async () => {
    const useCases = makeUseCases({ delete: jest.fn().mockRejectedValue(new EntityInUseError("category")) });
    const res = await request(makeApp(useCases)).delete("/categories/cat_1");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ENTITY_IN_USE");
  });

  it("returns 200 { deleted: true } on success", async () => {
    const useCases = makeUseCases();
    const res = await request(makeApp(useCases)).delete("/categories/cat_1");
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });
});

describe("GET /categories (list)", () => {
  it("returns paginated results", async () => {
    const useCases = makeUseCases();
    const res = await request(makeApp(useCases)).get("/categories?skip=0&take=10");
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(useCases.list).toHaveBeenCalledWith(undefined, { skip: 0, take: 10 });
  });
});
