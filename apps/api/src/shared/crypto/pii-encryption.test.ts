import { encryptPII, decryptPII, hashForLookup } from "./pii-encryption";

const TEST_KEY = "0".repeat(64); // 32 bytes hex — test-only key, never a real secret

beforeEach(() => {
  process.env.PII_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.PII_ENCRYPTION_KEY;
});

describe("encryptPII / decryptPII", () => {
  it("round-trips a plaintext value through encryption and decryption", () => {
    const encrypted = encryptPII("1234567890123");
    expect(decryptPII(encrypted)).toBe("1234567890123");
  });

  it("produces a different ciphertext each time for the same plaintext (random IV)", () => {
    const a = encryptPII("1234567890123");
    const b = encryptPII("1234567890123");
    expect(a).not.toBe(b);
    // Both still decrypt to the same original value.
    expect(decryptPII(a)).toBe(decryptPII(b));
  });

  it("stores the value as iv:authTag:ciphertext", () => {
    const encrypted = encryptPII("some-nid");
    expect(encrypted.split(":")).toHaveLength(3);
  });

  it("throws when PII_ENCRYPTION_KEY is missing", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    expect(() => encryptPII("x")).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it("throws (fails closed) if the auth tag has been tampered with", () => {
    const encrypted = encryptPII("1234567890123");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const tamperedTag = tag!.slice(0, -2) + (tag!.slice(-2) === "00" ? "ff" : "00");
    expect(() => decryptPII(`${iv}:${tamperedTag}:${ciphertext}`)).toThrow();
  });
});

describe("hashForLookup", () => {
  it("produces the same hash for the same input every time (deterministic)", () => {
    expect(hashForLookup("1234567890123")).toBe(hashForLookup("1234567890123"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashForLookup("1234567890123")).not.toBe(hashForLookup("9876543210987"));
  });

  it("is exactly what makes Employee.nidNumberHash's uniqueness check meaningful — unlike the encrypted value, which changes every time", () => {
    const nid = "1234567890123";
    const hash1 = hashForLookup(nid);
    const hash2 = hashForLookup(nid);
    const encrypted1 = encryptPII(nid);
    const encrypted2 = encryptPII(nid);

    expect(hash1).toBe(hash2); // same NID -> same hash -> a real duplicate is actually caught
    expect(encrypted1).not.toBe(encrypted2); // same NID -> different ciphertext -> unique() on this alone would miss the duplicate
  });
});
