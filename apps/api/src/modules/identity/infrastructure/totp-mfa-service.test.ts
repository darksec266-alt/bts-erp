import { TotpMfaService, generateTotpCodeForTest } from "./totp-mfa-service";

describe("TotpMfaService", () => {
  const service = new TotpMfaService();

  it("verifies a code generated from the same secret", async () => {
    const secret = service.generateSecret();
    const validCode = await generateTotpCodeForTest(secret);
    await expect(service.verifyCode(secret, validCode)).resolves.toBe(true);
  });

  it("rejects an arbitrary wrong code", async () => {
    const secret = service.generateSecret();
    await expect(service.verifyCode(secret, "000000")).resolves.toBe(false);
  });

  it("rejects a code generated from a different secret", async () => {
    const secretA = service.generateSecret();
    const secretB = service.generateSecret();
    const codeForB = await generateTotpCodeForTest(secretB);
    await expect(service.verifyCode(secretA, codeForB)).resolves.toBe(false);
  });

  it("generates an otpauth:// URL naming Brother's Technology System as the issuer", () => {
    const secret = service.generateSecret();
    const url = service.generateOtpAuthUrl(secret, "admin@bts.example");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain(encodeURIComponent("Brother's Technology System"));
  });
});
