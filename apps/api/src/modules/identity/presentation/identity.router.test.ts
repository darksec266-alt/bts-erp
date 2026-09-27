import express from "express";
import request from "supertest";
import { createIdentityRouter } from "./identity.router";
import { requestIdMiddleware } from "../../../shared/http";
import { errorHandler, notFoundHandler } from "../../../shared/errors/handler";
import { InvalidCredentialsError, AccountInactiveError, type LoginUseCase } from "../application/login.use-case";
import { RefreshTokenInvalidError, type RefreshTokenUseCase, type LogoutUseCase } from "../application/refresh-and-logout.use-case";

function makeApp(deps: {
  loginUseCase: Pick<LoginUseCase, "execute" | "verifyMfaAndIssueTokens" | "enrollMfaAndIssueTokens">;
  refreshTokenUseCase: Pick<RefreshTokenUseCase, "execute">;
  logoutUseCase: Pick<LogoutUseCase, "execute">;
}) {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());
  app.use(createIdentityRouter(deps as { loginUseCase: LoginUseCase; refreshTokenUseCase: RefreshTokenUseCase; logoutUseCase: LogoutUseCase }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("POST /auth/login", () => {
  it("returns 200 with tokens on a successful login", async () => {
    const loginUseCase = { execute: jest.fn().mockResolvedValue({ status: "SUCCESS", accessToken: "a", refreshToken: "r" }), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/login").send({ email: "x@bts.example", password: "correct" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUCCESS");
    expect(loginUseCase.execute).toHaveBeenCalledWith("x@bts.example", "correct");
  });

  it("returns 401 through the standard error envelope on invalid credentials", async () => {
    const loginUseCase = { execute: jest.fn().mockRejectedValue(new InvalidCredentialsError()), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/login").send({ email: "x@bts.example", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_ERROR");
    expect(res.body.data).toBeNull();
  });

  it("returns 403 for a deactivated account", async () => {
    const loginUseCase = { execute: jest.fn().mockRejectedValue(new AccountInactiveError()), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/login").send({ email: "x@bts.example", password: "correct" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  it("returns 422 when email or password is missing from the body", async () => {
    const loginUseCase = { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/login").send({ email: "x@bts.example" });

    expect(res.status).toBe(422);
    expect(loginUseCase.execute).not.toHaveBeenCalled();
  });
});

describe("POST /auth/mfa/verify", () => {
  it("returns tokens on a correct code", async () => {
    const loginUseCase = { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn().mockResolvedValue({ status: "SUCCESS", accessToken: "a", refreshToken: "r" }), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/mfa/verify").send({ mfaToken: "m", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUCCESS");
  });
});

describe("POST /auth/mfa/enroll", () => {
  it("returns tokens on a correct enrollment code", async () => {
    const loginUseCase = { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn().mockResolvedValue({ status: "SUCCESS", accessToken: "a", refreshToken: "r" }) };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/mfa/enroll").send({ mfaToken: "enroll-token", code: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUCCESS");
    expect(loginUseCase.enrollMfaAndIssueTokens).toHaveBeenCalledWith("enroll-token", "123456");
  });

  it("returns 401 on an incorrect enrollment code", async () => {
    const loginUseCase = { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn().mockRejectedValue(new InvalidCredentialsError()) };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/mfa/enroll").send({ mfaToken: "enroll-token", code: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_ERROR");
  });

  it("returns 422 when mfaToken or code is missing", async () => {
    const loginUseCase = { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() };
    const app = makeApp({ loginUseCase, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/mfa/enroll").send({ mfaToken: "enroll-token" });

    expect(res.status).toBe(422);
    expect(loginUseCase.enrollMfaAndIssueTokens).not.toHaveBeenCalled();
  });
});

describe("POST /auth/refresh", () => {
  it("returns a new token pair on a valid refresh token", async () => {
    const refreshTokenUseCase = { execute: jest.fn().mockResolvedValue({ accessToken: "new-a", refreshToken: "new-r" }) };
    const app = makeApp({ loginUseCase: { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() }, refreshTokenUseCase, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/refresh").send({ refreshToken: "old-r" });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe("new-a");
  });

  it("returns 401 for an invalid/revoked refresh token", async () => {
    const refreshTokenUseCase = { execute: jest.fn().mockRejectedValue(new RefreshTokenInvalidError("revoked")) };
    const app = makeApp({ loginUseCase: { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() }, refreshTokenUseCase, logoutUseCase: { execute: jest.fn() } });

    const res = await request(app).post("/auth/refresh").send({ refreshToken: "old-r" });

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("returns 200 loggedOut:true even when the token was already invalid (idempotent-tolerant)", async () => {
    const logoutUseCase = { execute: jest.fn().mockRejectedValue(new Error("already gone")) };
    const app = makeApp({ loginUseCase: { execute: jest.fn(), verifyMfaAndIssueTokens: jest.fn(), enrollMfaAndIssueTokens: jest.fn() }, refreshTokenUseCase: { execute: jest.fn() }, logoutUseCase });

    const res = await request(app).post("/auth/logout").send({ refreshToken: "r" });

    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);
  });
});
