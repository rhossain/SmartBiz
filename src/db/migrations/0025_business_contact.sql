-- 0025 — AuthComponent: the business's phone and address (Business page, mockups §17.2).
--
-- Both are optional and printed on every invoice and delivery slip once set. The phone is a
-- Bangladeshi mobile number, 11 digits starting 01 (the same rule as a customer's phone); the
-- address is at most 300 characters. The name (already NOT NULL) and the default language
-- (`locale`) stay as they are.
--
-- No grant changes: app_role already holds SELECT, INSERT, UPDATE on businesses (0014).
-- Idempotent: ADD COLUMN IF NOT EXISTS; each CHECK is added only when missing.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_phone_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_phone_check
      CHECK (phone IS NULL OR phone ~ '^01[0-9]{9}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_address_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_address_check
      CHECK (address IS NULL OR char_length(address) BETWEEN 1 AND 300);
  END IF;
END $$;
