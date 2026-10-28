/**
 * src/auth/recover.ts — "I forgot my password" from the browser (AuthComponent; U3 W6;
 * BR5.1, BR9.4; S21 as revised by D-01; NFR3.18; review F-07).
 *
 * There is no email service (zero spend, NFR10.3), so recovery from the browser cannot send
 * anything. It therefore does nothing at all, for every email alike: no lookup, no token, no
 * audit row, no hash-gate slot (D-01). The answer is the same 202 with an empty body, and
 * the screen says to ask the Owner, or the terminal on this machine, for a reset link
 * (BR9.4). Because it takes no `sql` and no gate, it cannot reveal whether an email exists,
 * by its answer or by its timing (NFR3.18): a SQL spy records zero statements and a gate
 * spy zero calls by construction.
 *
 * Retired (F-07): `requestRecovery` and its 1-hour uuid tokens, the all-zero business id it
 * filed audit rows under, and `resetPassword`; the reset is src/auth/password-reset.ts.
 */

/** The only outcome: accepted, nothing done (C6: 202, identical empty body). */
export interface RecoverOutcome {
  readonly status: 202;
}

export const RECOVER_OUTCOME: RecoverOutcome = Object.freeze({ status: 202 });

/** BR5.1: the email was parsed at the boundary and is deliberately not used. */
export const recover = (_input: { readonly email: string }): RecoverOutcome => RECOVER_OUTCOME;
