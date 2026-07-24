ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CUSTOMER';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cod_collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS cod_collected_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_customer_user_idx
  ON orders (customer_user_id, created_at DESC);
