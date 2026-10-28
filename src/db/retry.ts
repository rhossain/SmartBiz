/**
 * src/db/retry.ts — run a write transaction again after a deadlock or a serialisation
 * failure (PersistenceComponent; U3 S22, R14; NFR7.18; review D-03).
 *
 * Only SQLSTATE 40P01 (deadlock detected) and 40001 (serialization failure) are retried;
 * every other error is rethrown at once. Filled in Step 5.
 */
export {};
