-- 0012 — AuthComponent, U1 u1-skeleton: sessions keyed by the hash of a random cookie value
-- (BR3.1, BR9.4).
--
-- The cookie carries 32 random bytes; only their SHA-256 hex is stored, in token_hash. Rows
-- written before U1 have no token and were never usable (there was no read path, P-4), so
-- they are deleted before the NOT NULL column is added. The whole block runs only while
-- token_hash does not exist yet, so a re-run deletes nothing and signs nobody out (the
-- _migrations ledger also applies this file once).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'sessions' AND column_name = 'token_hash'
  ) THEN
    DELETE FROM sessions;
    ALTER TABLE sessions ADD COLUMN token_hash TEXT NOT NULL;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash);
