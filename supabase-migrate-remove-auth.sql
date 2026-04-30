-- ============================================================
-- QuickBill POS — Migration: Remove auth & user profile logic
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================
-- IMPORTANT: This is a destructive migration. Back up your data first.
-- In Supabase Dashboard: Settings > Database > Backups > Create backup

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Drop the save_bill function (will be recreated without user_id)
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS save_bill(NUMERIC, NUMERIC, JSONB, NUMERIC, TEXT, UUID, TEXT);


-- ────────────────────────────────────────────────────────────
-- 2. Drop all RLS policies
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users manage own profile"   ON profiles;
DROP POLICY IF EXISTS "Users manage own categories" ON categories;
DROP POLICY IF EXISTS "Users manage own items"      ON items;
DROP POLICY IF EXISTS "Users manage own customers"  ON customers;
DROP POLICY IF EXISTS "Users manage own bills"      ON bills;
DROP POLICY IF EXISTS "Users see own bill lines"    ON bill_lines;
DROP POLICY IF EXISTS "Users see own stock ledger"  ON stock_ledger;
DROP POLICY IF EXISTS "Users manage own settings"   ON app_settings;


-- ────────────────────────────────────────────────────────────
-- 3. Disable RLS on all tables
-- ────────────────────────────────────────────────────────────
ALTER TABLE categories   DISABLE ROW LEVEL SECURITY;
ALTER TABLE items        DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers    DISABLE ROW LEVEL SECURITY;
ALTER TABLE bills        DISABLE ROW LEVEL SECURITY;
ALTER TABLE bill_lines   DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 4. Drop user_id foreign keys, then drop the columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE items        DROP CONSTRAINT IF EXISTS items_user_id_fkey;
ALTER TABLE bills        DROP CONSTRAINT IF EXISTS bills_user_id_fkey;
ALTER TABLE categories   DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE customers    DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_user_id_fkey;

ALTER TABLE items        DROP COLUMN IF EXISTS user_id;
ALTER TABLE bills        DROP COLUMN IF EXISTS user_id;
ALTER TABLE categories   DROP COLUMN IF EXISTS user_id;
ALTER TABLE customers    DROP COLUMN IF EXISTS user_id;
ALTER TABLE app_settings DROP COLUMN IF EXISTS user_id;


-- ────────────────────────────────────────────────────────────
-- 5. Drop the profiles table
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS profiles CASCADE;


-- ────────────────────────────────────────────────────────────
-- 6. Recreate indexes without user_id
-- ────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_items_user_active;
DROP INDEX IF EXISTS idx_items_user_category;
DROP INDEX IF EXISTS idx_bills_user_date;
DROP INDEX IF EXISTS idx_customers_user_phone;

CREATE INDEX idx_items_active   ON items(is_active);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_bills_date     ON bills(created_at DESC);

CREATE UNIQUE INDEX idx_customers_phone
  ON customers(phone) WHERE phone IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 7. Fix app_settings unique constraint (key only, no user_id)
-- ────────────────────────────────────────────────────────────
ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_user_id_key;

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_key_unique UNIQUE (key);


-- ────────────────────────────────────────────────────────────
-- 8. Recreate save_bill without user_id / auth.uid()
-- ────────────────────────────────────────────────────────────
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

COMMIT;
