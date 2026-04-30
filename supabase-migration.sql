-- ============================================================
-- QuickBill POS — Full Supabase Migration (single-user, no auth)
-- Run this ONCE in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. CATEGORIES
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 2. ITEMS (product catalog)
CREATE TABLE items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  unit                TEXT NOT NULL,
  image_url           TEXT,
  stock_qty           NUMERIC(10,3) DEFAULT 0,
  low_stock_threshold NUMERIC(10,3),
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_items_active ON items(is_active);
CREATE INDEX idx_items_category ON items(category_id);

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- 3. CUSTOMERS
CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT,
  balance    NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_phone
  ON customers(phone) WHERE phone IS NOT NULL;


-- 4. BILLS
CREATE TABLE bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number  SERIAL,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal     NUMERIC(10,2) NOT NULL,
  discount     NUMERIC(10,2) DEFAULT 0,
  total        NUMERIC(10,2) NOT NULL,
  payment_mode TEXT DEFAULT 'cash',
  status       TEXT DEFAULT 'completed' CHECK (status IN ('completed','returned','voided')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bills_date ON bills(created_at DESC);


-- 5. BILL_LINES
CREATE TABLE bill_lines (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id    UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  item_id    UUID REFERENCES items(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  qty        NUMERIC(10,3) NOT NULL,
  unit       TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total      NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bill_lines_bill ON bill_lines(bill_id);
CREATE INDEX idx_bill_lines_item ON bill_lines(item_id);


-- 6. STOCK_LEDGER
CREATE TABLE stock_ledger (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id    UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  change     NUMERIC(10,3) NOT NULL,
  reason     TEXT NOT NULL,
  ref_id     UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- 7. APP_SETTINGS (key-value store)
CREATE TABLE app_settings (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);


-- ============================================================
-- RPC: save_bill — atomic bill creation with stock decrement
-- Called from the client as: supabase.rpc('save_bill', { ... })
-- ============================================================
CREATE OR REPLACE FUNCTION save_bill(
  p_subtotal     NUMERIC,
  p_total        NUMERIC,
  p_lines        JSONB,
  p_discount     NUMERIC DEFAULT 0,
  p_payment_mode TEXT DEFAULT 'cash',
  p_customer_id  UUID DEFAULT NULL,
  p_notes        TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_bill_id UUID;
  v_line    JSONB;
BEGIN
  INSERT INTO bills (subtotal, discount, total, payment_mode, customer_id, notes)
  VALUES (p_subtotal, p_discount, p_total, p_payment_mode, p_customer_id, p_notes)
  RETURNING id INTO v_bill_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO bill_lines (bill_id, item_id, name, qty, unit, unit_price, total)
    VALUES (
      v_bill_id,
      (v_line->>'item_id')::UUID,
      v_line->>'name',
      (v_line->>'qty')::NUMERIC,
      v_line->>'unit',
      (v_line->>'unit_price')::NUMERIC,
      (v_line->>'total')::NUMERIC
    );

    UPDATE items
    SET stock_qty = stock_qty - (v_line->>'qty')::NUMERIC
    WHERE id = (v_line->>'item_id')::UUID;

    INSERT INTO stock_ledger (item_id, change, reason, ref_id)
    VALUES (
      (v_line->>'item_id')::UUID,
      -1 * (v_line->>'qty')::NUMERIC,
      'sale',
      v_bill_id
    );
  END LOOP;

  RETURN v_bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
