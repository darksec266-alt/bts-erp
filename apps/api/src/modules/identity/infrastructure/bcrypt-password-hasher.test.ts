import { BcryptPasswordHasher } from "./bcrypt-password-hasher";

describe("BcryptPasswordHasher", () => {
  const hasher = new BcryptPasswordHasher();

  it("hashes a password to something other than the plain text", async () => {
    const hash = await hasher.hash("correct-horse-battery-staple");
    expect(hash).not.toBe("correct-horse-battery-staple");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifies a correct password against its own hash", async () => {
    const hash = await hasher.hash("my-secret-password");
    await expect(hasher.compare("my-secret-password", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hasher.hash("my-secret-password");
    await expect(hasher.compare("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const hash1 = await hasher.hash("same-input");
    const hash2 = await hasher.hash("same-input");
    expect(hash1).not.toBe(hash2);
  });
});
