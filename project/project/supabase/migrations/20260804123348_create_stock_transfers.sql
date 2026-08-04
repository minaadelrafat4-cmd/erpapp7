/*
# Create stock_transfers and stock_transfer_items tables

1. Purpose
   Adds inter-location stock transfer tracking to the ERP. Stock transfers
   move inventory between branches and/or warehouses. This migration does NOT
   modify any existing tables — it only adds two new tables.

2. New Tables
   - `stock_transfers`
     - id (uuid, PK)
     - transfer_number (text, unique, auto-generated)
     - status (text: draft|submitted|in_transit|received|cancelled)
     - source_type (text: branch|warehouse)
     - source_id (uuid)
     - destination_type (text: branch|warehouse)
     - destination_id (uuid)
     - notes (text, nullable)
     - created_by (uuid, nullable, references auth.users)
     - created_at, updated_at (timestamptz)
   - `stock_transfer_items`
     - id (uuid, PK)
     - transfer_id (uuid, FK to stock_transfers ON DELETE CASCADE)
     - product_id (uuid)
     - quantity (integer, > 0)
     - received_quantity (integer, >= 0, default 0)
     - created_at (timestamptz)

3. Security
   - RLS enabled on both tables, scoped TO authenticated (app has sign-in).
   - Full CRUD for authenticated staff on both tables.

4. Notes
   - product_id is NOT FK-constrained to products because the products table
     may not exist in all environments; the application layer validates product IDs.
   - source_id / destination_id are plain uuid (can reference branches or warehouses).
*/

CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL DEFAULT ('TR-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_transit','received','cancelled')),
  source_type text NOT NULL CHECK (source_type IN ('branch','warehouse')),
  source_id uuid NOT NULL,
  destination_type text NOT NULL CHECK (destination_type IN ('branch','warehouse')),
  destination_id uuid NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_created_at ON stock_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_id ON stock_transfer_items(transfer_id);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_stock_transfers" ON stock_transfers;
CREATE POLICY "select_stock_transfers" ON stock_transfers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_stock_transfers" ON stock_transfers;
CREATE POLICY "insert_stock_transfers" ON stock_transfers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_stock_transfers" ON stock_transfers;
CREATE POLICY "update_stock_transfers" ON stock_transfers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_stock_transfers" ON stock_transfers;
CREATE POLICY "delete_stock_transfers" ON stock_transfers FOR DELETE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "select_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "select_stock_transfer_items" ON stock_transfer_items FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "insert_stock_transfer_items" ON stock_transfer_items FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "update_stock_transfer_items" ON stock_transfer_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "delete_stock_transfer_items" ON stock_transfer_items FOR DELETE
  TO authenticated USING (true);
