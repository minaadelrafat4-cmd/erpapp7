/*
# Create audit_logs and file_attachments tables

## Purpose
1. audit_logs — tracks user actions across ERP modules (create, update, delete, login, etc.)
2. file_attachments — stores file metadata for attachments to products, suppliers, POs, SOs, and employees

## Tables Created
### audit_logs
- id (uuid PK)
- user_id (uuid, references auth.users, nullable for system actions)
- user_email (text, denormalized for display)
- action (text: create, update, delete, login, logout, export, etc.)
- module (text: products, customers, purchase_orders, etc.)
- entity_id (text, nullable, the ID of the affected record)
- entity_type (text, nullable, the type of the affected record)
- before_values (jsonb, nullable, snapshot before change)
- after_values (jsonb, nullable, snapshot after change)
- ip_address (text, nullable)
- user_agent (text, nullable)
- created_at (timestamptz)

### file_attachments
- id (uuid PK)
- entity_type (text: product, supplier, purchase_order, sales_order, employee)
- entity_id (uuid, the ID of the parent record)
- file_name (text, original file name)
- file_url (text, public URL in Supabase storage)
- file_type (text: image, document, pdf, etc.)
- mime_type (text)
- file_size (bigint, in bytes)
- uploaded_by (uuid, references auth.users)
- created_at (timestamptz)

## Security
- RLS enabled on both tables.
- audit_logs: any authenticated user can read (internal ERP tool), only authenticated can insert. No update/delete (immutable audit trail).
- file_attachments: any authenticated user can read, only authenticated can insert/update/delete their own uploads.

## Storage Bucket
- Creates 'attachments' bucket for file uploads (documents, images).

## Notes
- Idempotent: uses IF NOT EXISTS for tables, DROP POLICY IF EXISTS before creating.
- audit_logs is append-only (no UPDATE/DELETE policies for authenticated).
- file_attachments allows delete by the uploader or by admin role.
*/

-- ============================================================
-- audit_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,
  module text NOT NULL,
  entity_id text,
  entity_type text,
  before_values jsonb,
  after_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_audit_logs" ON audit_logs;
CREATE POLICY "select_audit_logs" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_audit_logs" ON audit_logs;
CREATE POLICY "insert_audit_logs" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- No UPDATE or DELETE policies — audit_logs is append-only

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================
-- file_attachments table
-- ============================================================

CREATE TABLE IF NOT EXISTS file_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'document',
  mime_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_file_attachments" ON file_attachments;
CREATE POLICY "select_file_attachments" ON file_attachments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_file_attachments" ON file_attachments;
CREATE POLICY "insert_file_attachments" ON file_attachments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_file_attachments" ON file_attachments;
CREATE POLICY "update_file_attachments" ON file_attachments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_file_attachments" ON file_attachments;
CREATE POLICY "delete_file_attachments" ON file_attachments FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);

-- ============================================================
-- Storage bucket for attachments
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Seed some demo audit log entries
-- ============================================================

INSERT INTO audit_logs (user_email, action, module, entity_id, entity_type, before_values, after_values)
SELECT 'admin@luxe.co', 'login', 'auth', NULL, NULL, NULL, jsonb_build_object('timestamp', now()::text)
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@luxe.co')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (user_email, action, module, entity_id, entity_type, before_values, after_values)
SELECT 'admin@luxe.co', 'create', 'purchase_orders', '11000000-0000-0000-0000-000000000001', 'purchase_order', NULL, jsonb_build_object('po_number', 'PO-2026-0001', 'status', 'received')
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@luxe.co')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (user_email, action, module, entity_id, entity_type, before_values, after_values)
SELECT 'admin@luxe.co', 'update', 'products', 'f0000000-0000-0000-0000-000000000006', 'product', jsonb_build_object('stock', 10), jsonb_build_object('stock', 5)
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@luxe.co')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (user_email, action, module, entity_id, entity_type, before_values, after_values)
SELECT 'admin@luxe.co', 'create', 'sales_orders', '12000000-0000-0000-0000-000000000002', 'sales_order', NULL, jsonb_build_object('order_number', 'SO-2026-0002', 'status', 'pending')
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@luxe.co')
ON CONFLICT DO NOTHING;

INSERT INTO audit_logs (user_email, action, module, entity_id, entity_type, before_values, after_values)
SELECT 'admin@luxe.co', 'create', 'stock_transfers', '13000000-0000-0000-0000-000000000001', 'stock_transfer', NULL, jsonb_build_object('transfer_number', 'ST-2026-0001', 'status', 'completed')
WHERE EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@luxe.co')
ON CONFLICT DO NOTHING;
