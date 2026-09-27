// Application-layer port (prompt.md §132's Repository Interface Rule
// applied to a service, not just a repository) — the use case depends on
// this interface, never on bcryptjs directly, so it stays unit-testable
// without hashing anything for real.
export interface PasswordHasher {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
