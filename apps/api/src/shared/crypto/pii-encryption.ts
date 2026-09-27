import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// architecture.md §22: "encryption... at rest for sensitive fields
// (customer payment info, NID uploads)." AES-256-GCM, adapted from the
// pattern in docs/database_remediation_technical_implementation_guide.md
// §4.1 — that reference targeted a JSON column with three separate
// fields (ciphertext/iv/tag); this packs them into one delimited string
// since schema.prisma's PII columns (Employee.nidNumberEncrypted) are
// plain String columns, not JSON.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getEncryptionKey(): Buffer {
  const hex = process.env.PII_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("PII_ENCRYPTION_KEY environment variable is required to encrypt/decrypt PII fields.");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("PII_ENCRYPTION_KEY must be a 32-byte value expressed as 64 hex characters.");
  }
  return key;
}

export function encryptPII(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

export function decryptPII(packed: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, ciphertextHex] = packed.split(":");
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted PII value — expected 'iv:authTag:ciphertext'.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

// Deterministic — same plaintext always produces the same hash, which is
// exactly why this (not the encrypted value) is what Employee.nidNumberHash
// uniquely indexes on: AES-GCM's random IV means encryptPII() of the same
// NID twice never produces the same ciphertext, so a `@unique` constraint
// on the ciphertext would never catch a real duplicate.
export function hashForLookup(plainText: string): string {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY environment variable is required to hash PII fields.");
  }
  return createHmac("sha256", key).update(plainText).digest("hex");
}
