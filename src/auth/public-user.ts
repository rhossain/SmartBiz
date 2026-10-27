/**
 * src/auth/public-user.ts — the only ways a user leaves AuthComponent (BR4.4, NFR3.6).
 *
 * `toPublicUser` copies the four public fields by name, so a field added to `UserRecord`
 * (such as the password hash) can never ride along. `toSessionView` builds the C2 `Session`
 * body; its capability list comes from the role × capability matrix, so the client can
 * build its navigation without restating the matrix.
 */
import type { Locale, Role } from "../data/enums.js";
import type { Uuid } from "../data/uuid.js";
import { capabilitiesFor } from "./capability.js";
import type { PublicUser, SessionView } from "./types.js";

export const toPublicUser = (user: {
  readonly id: Uuid;
  readonly email: string;
  readonly role: Role;
  readonly locale: Locale;
}): PublicUser => ({ id: user.id, email: user.email, role: user.role, locale: user.locale });

export const toSessionView = (user: PublicUser, businessId: Uuid): SessionView => ({
  user,
  businessId,
  capabilities: [...capabilitiesFor(user.role)].sort(),
});
