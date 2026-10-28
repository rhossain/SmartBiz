-- 0017 — AuthComponent, U3 u3-staff: one row per token hash (SC6; NFR3.16, NFR6.24;
-- infrastructure-design Q3, I-01, I-02).
--
-- Invitations and password resets are found by the SHA-256 hex of their one-time token
-- (src/auth/accept-invite.ts, src/auth/password-reset.ts). A unique index on each hash
-- column makes that lookup an index probe and guarantees a hash names one row. Tokens are
-- 32 random bytes, so a duplicate cannot occur by chance; if one exists anyway, the migration
-- stops with `duplicate_token_hash` inside its transaction and changes nothing, which is
-- clearer than a failed index build.
--
-- An index needs no grant: the exact grant set (C9) is unchanged (NFR2.5). Rollback: the
-- indexes are harmless to older code and stay after a revert; if they must be dropped, the
-- same admin session also deletes the `_migrations` row (README "Backup and restore", I-01).
--
-- Idempotent: the check reads only, and both indexes use IF NOT EXISTS.
DO $$
BEGIN
  IF EXISTS (SELECT accept_token_hash FROM invitations GROUP BY accept_token_hash HAVING count(*) > 1)
     OR EXISTS (SELECT token_hash FROM password_resets GROUP BY token_hash HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'duplicate_token_hash';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_accept_token_hash_idx ON invitations (accept_token_hash);

CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_hash_idx ON password_resets (token_hash);
