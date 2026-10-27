/**
 * src/data/types.ts — shared entity types (the data-access layer
 * re-uses these). Re-exported from src/auth/types.ts so consumers
 * can pick the import path that fits their layer.
 */
export type {
  Role,
  Locale,
  Capability,
  User,
  Business,
  Invitation,
  Session,
  AuditEntry,
  PasswordReset,
} from "../auth/types.js";
