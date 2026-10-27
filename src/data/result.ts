/**
 * src/data/result.ts — Result<T, E>, the project's standard discriminated union
 * (moved from src/types/ by domain-design follow-up R-04).
 *
 * Business outcomes are values: fallible domain functions return `Result` with a closed
 * union of `{ kind: "<snake_case>" }` errors. Infrastructure failures (a lost connection,
 * a corrupt row) are thrown instead, because they are not outcomes a caller can act on
 * (team.md Code Style). The module is pure and browser-safe.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;
