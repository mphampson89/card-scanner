-- Cropped business-card photo (JPEG data URL) shown on the contact screen.
-- Also applied automatically by ensureSchema() in netlify/functions/_db.js.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS card_image text NOT NULL DEFAULT '';
