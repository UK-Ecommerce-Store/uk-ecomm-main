ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS address_label text;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(trim(label)) BETWEEN 1 AND 40),
  address_line1 text NOT NULL CHECK (char_length(trim(address_line1)) BETWEEN 5 AND 240),
  address_line2 text,
  city text NOT NULL DEFAULT 'Surat',
  state text NOT NULL DEFAULT 'Gujarat',
  postal_code text NOT NULL CHECK (postal_code ~ '^(394|395)[0-9]{3}$'),
  latitude double precision,
  longitude double precision,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)
);
CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON customer_addresses (user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_user_label_unique ON customer_addresses (user_id, lower(label));
CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_idx ON customer_addresses (user_id) WHERE is_default=true;

DROP TRIGGER IF EXISTS customer_addresses_set_updated_at ON customer_addresses;
CREATE TRIGGER customer_addresses_set_updated_at BEFORE UPDATE ON customer_addresses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS passkeys (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webauthn_user_id text NOT NULL,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  device_type text NOT NULL,
  backed_up boolean NOT NULL DEFAULT false,
  transports text[],
  name text NOT NULL DEFAULT 'Passkey' CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS passkeys_user_idx ON passkeys (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS passkeys_webauthn_user_idx ON passkeys (user_id, webauthn_user_id, id);
