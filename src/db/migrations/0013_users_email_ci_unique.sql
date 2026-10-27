-- 0013 — AuthComponent, U1 u1-skeleton: one account per email, ignoring case (BR9.4).
--
-- Sign-in looks a user up by lower(email), so two rows that differ only by case would make
-- the lookup ambiguous. The migration stops with `users_email_case_duplicate` when such a
-- pair exists (nothing changes), then replaces the plain lower(email) index and the
-- case-sensitive UNIQUE of 0001 with one unique index on lower(email).
--
-- Idempotent: the check, the drops and the create are all guarded.
DO $$
BEGIN
  IF EXISTS (SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'users_email_case_duplicate';
  END IF;
END
$$;

DROP INDEX IF EXISTS users_email_lower_idx;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx ON users (lower(email));
