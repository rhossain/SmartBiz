-- 0026 — CatalogComponent: one photo per product (product photos, stored on this machine).
--
-- The image bytes live on disk in the photo directory (SMARTBIZ_PHOTO_DIR, default
-- data/photos, gitignored), never in the database; the row records which file is current and
-- its type, so a failed write can never point the row at a half-written or wrong-type file:
--   photo_file        the server-chosen file name, `<uuid>.<jpg|png|webp>` (no person-typed
--                     text ever reaches a path);
--   photo_type        image/jpeg, image/png or image/webp;
--   photo_updated_at  when it was set (the app uses it to refresh the shown image).
-- All three are set together or all NULL (no photo).
--
-- No grant changes: app_role already holds SELECT, INSERT, UPDATE on products (0021).
-- Idempotent: ADD COLUMN IF NOT EXISTS; the CHECKs are added only when missing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_file TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_photo_check') THEN
    ALTER TABLE products ADD CONSTRAINT products_photo_check CHECK (
      (photo_file IS NULL AND photo_type IS NULL AND photo_updated_at IS NULL)
      OR (
        photo_file ~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
        AND photo_type IN ('image/jpeg', 'image/png', 'image/webp')
        AND photo_updated_at IS NOT NULL
      )
    );
  END IF;
END $$;
