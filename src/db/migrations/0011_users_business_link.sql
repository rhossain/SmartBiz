-- 0011 — AuthComponent, U1 u1-skeleton: link every user to the business (BR2.6, BR2.3, BR9.4).
--
-- users.business_id lets staff (U3) and the Owner resolve their business the same way, so
-- the zero-UUID business fallback in sign-in disappears. Steps:
--   1. add the column nullable;
--   2. fill it from the business each user owns;
--   3. stop with `users_without_business` if any user is still unlinked (nothing changes:
--      the migration runs in one transaction);
--   4. set NOT NULL and add the reference DEFERRABLE INITIALLY DEFERRED, so sign-up can
--      insert the user before the business inside one transaction (BR2.2);
--   5. make the business a singleton: a unique index on a constant expression refuses a
--      second row, even under racing sign-ups (BR2.3).
--
-- Idempotent: every step is guarded, so a manual re-run changes nothing.
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id UUID;

UPDATE users u
SET business_id = b.id
FROM businesses b
WHERE b.owner_user_id = u.id AND u.business_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE business_id IS NULL) THEN
    RAISE EXCEPTION 'users_without_business';
  END IF;
END
$$;

ALTER TABLE users ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_business_id_fkey') THEN
    ALTER TABLE users
      ADD CONSTRAINT users_business_id_fkey FOREIGN KEY (business_id)
      REFERENCES businesses (id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS users_business_idx ON users (business_id);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_singleton_idx ON businesses ((true));
