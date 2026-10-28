/**
 * src/db/retry.ts — run a write transaction again after a deadlock or a serialisation
 * failure (PersistenceComponent; U3 S22, R14; NFR7.18; review F-04, D-03, E-01).
 *
 * Every U3 write transaction takes its row locks in one order — business → invitation →
 * users → resets (D-03, E-01) — so two of them should never deadlock. Foreign-key checks
 * take share locks of their own, though, and a deadlock or a serialisation failure is
 * cheap to survive: `withRetry(times, codes, fn)` runs `fn` once and, when it throws an
 * error whose SQLSTATE is in `codes`, runs it again, at most `times` more times. Any other
 * error is rethrown at once, untouched (team.md: infrastructure failures are thrown). When
 * the last attempt fails too, its error is rethrown, so the caller decides what a second
 * failure means (410 `gone` for accept and reset, 503 `db_unavailable` for invite and the
 * reset link, D-03).
 *
 * `fn` must be a whole transaction (`sql.begin(...)`): Postgres has already rolled the
 * failed attempt back, so running it again cannot apply anything twice.
 */

/** 40P01 deadlock_detected, 40001 serialization_failure: the only codes ever retried. */
export const RETRY_CODES: ReadonlyArray<string> = ["40P01", "40001"];

/** The SQLSTATE of a thrown database error, or null. */
export const sqlStateOf = (e: unknown): string | null => {
  if (typeof e !== "object" || e === null) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
};

/** True when `e` is a deadlock or a serialisation failure (what `withRetry` retries). */
export const isRetryableConflict = (e: unknown): boolean =>
  RETRY_CODES.includes(sqlStateOf(e) ?? "");

export const withRetry = async <T>(
  times: number,
  codes: ReadonlyArray<string>,
  fn: () => Promise<T>,
): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (e: unknown) {
      const code = sqlStateOf(e);
      if (attempt >= times || code === null || !codes.includes(code)) throw e;
    }
  }
};
