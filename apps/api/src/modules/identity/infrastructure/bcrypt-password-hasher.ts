import bcrypt from "bcryptjs";
import type { PasswordHasher } from "../application/password-hasher.port";

// architecture.md §22: "Password hashing via bcrypt/Argon2." bcryptjs (pure
// JS, no native bindings) chosen over native bcrypt — one less thing that
// can fail to compile across different deployment targets, at an
// acceptable performance cost for this platform's login volume.
const SALT_ROUNDS = 12;

export class BcryptPasswordHasher implements PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
