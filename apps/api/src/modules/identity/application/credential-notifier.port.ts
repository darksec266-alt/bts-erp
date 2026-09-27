// api-spec.md §12: "creates the linked User record and sends a first-login
// credential." Real delivery (email/SMS) is Phase 15 (Notifications &
// Realtime, prompt.md §199) — this port lets ProvisionUserUseCase depend
// on "a way to deliver a credential" today without waiting for that phase
// to exist, and without silently doing nothing.
export interface CredentialNotifier {
  sendFirstLoginCredential(email: string, temporaryPassword: string): Promise<void>;
}

// Phase 0-2 stand-in: logs instead of actually emailing/texting anything.
// Deliberately loud about being a stub (never silently "successful" in a
// way that could be mistaken for a real delivery) — swap for a real
// EmailLog/SmsLog-backed implementation (schema.prisma's Integration
// models, already defined) once Phase 15 exists.
export class ConsoleCredentialNotifier implements CredentialNotifier {
  async sendFirstLoginCredential(email: string, temporaryPassword: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[STUB — no real delivery until Phase 15] First-login credential for ${email}: ${temporaryPassword}`);
  }
}
