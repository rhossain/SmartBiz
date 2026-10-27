/**
 * Result<T, E> — the project's standard discriminated union.
 * Carried forward into every layer (data + business logic + api).
 * No exception value here (each call site returns its own error
 * union); the rules-of-the-road forbid extras
 * (see team.md#Code Style §CS-1 + the
 * "no throw across module boundaries" line in the plan).
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;
