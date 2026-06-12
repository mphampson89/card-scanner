CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  title         text NOT NULL DEFAULT '',
  company       text NOT NULL DEFAULT '',
  work_phone    text NOT NULL DEFAULT '',
  mobile_phone  text NOT NULL DEFAULT '',
  email         text NOT NULL DEFAULT '',
  website       text NOT NULL DEFAULT '',
  street        text NOT NULL DEFAULT '',
  city          text NOT NULL DEFAULT '',
  province      text NOT NULL DEFAULT '',
  postal_code   text NOT NULL DEFAULT '',
  country       text NOT NULL DEFAULT '',
  notes         text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contacts_email_lower_idx ON contacts (lower(email));
CREATE INDEX contacts_search_trgm_idx ON contacts
  USING gin ((lower(first_name || ' ' || last_name || ' ' || company)) gin_trgm_ops);
