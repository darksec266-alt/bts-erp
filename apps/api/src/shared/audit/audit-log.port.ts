// architecture.md §52: certain events (permission changes, account
// deactivation, login failures) are tagged `security` in AuditLog and get
// extra retention/visibility. Shared (not identity-module-only) because
// every future module will eventually need to write audit rows too —
// living in shared/ rather than modules/identity/ avoids a false
// module-ownership signal.
export interface AuditLogEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string | null;
}

export interface AuditLogWriter {
  write(entry: AuditLogEntry): Promise<void>;
}
