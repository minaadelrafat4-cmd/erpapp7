/*
# Create LUXE ERP Core Schema

## Purpose
Creates all 24 tables required by the LUXE ERP mobile companion app. Tables are created in dependency order (suppliers before products, products before product_images, etc.). The app uses Supabase email/password auth, so all policies scope TO authenticated.

## Tables Created (24)
1. profiles — staff user profiles (PK = auth.users.id)
2. categories — product categories
3. brands — product brands
4. suppliers — vendor/supplier records
5. products — main product catalog with ERP + vape industry fields
6. product_images — multiple images per product
7. branches — physical store locations
8. warehouses — storage locations
9. inventory — stock levels per product per location
10. customers — customer records (linked to auth.users)
11. addresses — customer shipping/billing addresses
12. purchase_orders — POs to suppliers
13. purchase_order_items — line items on POs
14. orders — customer sales orders
15. order_items — line items on sales orders
16. roles — role definitions
17. employees — staff employee records
18. employee_roles — junction: employee ↔ roles
19. notifications — in-app notifications
20. reports — saved/scheduled reports
21. tasks — work tasks assignable to employees
22. stock_transfers — inter-location stock transfers
23. stock_transfer_items — line items on stock transfers
24. push_tokens — Expo push notification tokens per device

## Security
- RLS enabled on ALL tables.
- Policies scope TO authenticated (app has login screen).
- profiles: users can read/update their own row (auth.uid() = id).
- notifications: users see their own + null user_id (broadcast) notifications.
- push_tokens: users manage only their own tokens.
- All other ERP tables: any authenticated staff can read/write (internal ERP tool).

## Notes
- Idempotent: uses IF NOT EXISTS for tables, DROP POLICY IF EXISTS before creating.
- profiles.id and customers.user_id reference auth.users.id.
- All PKs use gen_random_uuid() except profiles (uses auth.users.id).
*/

-- ============================================================
-- profiles (linked to auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'staff',
  status text NOT NULL DEFAULT 'active',
  failed_login_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- categories (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categories" ON categories;
CREATE POLICY "select_categories" ON categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_categories" ON categories;
CREATE POLICY "insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_categories" ON categories;
CREATE POLICY "update_categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_categories" ON categories;
CREATE POLICY "delete_categories" ON categories FOR DELETE TO authenticated USING (true);

-- ============================================================
-- brands (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  country text,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_brands" ON brands;
CREATE POLICY "select_brands" ON brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_brands" ON brands;
CREATE POLICY "insert_brands" ON brands FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_brands" ON brands;
CREATE POLICY "update_brands" ON brands FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_brands" ON brands;
CREATE POLICY "delete_brands" ON brands FOR DELETE TO authenticated USING (true);

-- ============================================================
-- suppliers (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  country text,
  payment_terms text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_suppliers" ON suppliers;
CREATE POLICY "select_suppliers" ON suppliers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_suppliers" ON suppliers;
CREATE POLICY "insert_suppliers" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_suppliers" ON suppliers;
CREATE POLICY "update_suppliers" ON suppliers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_suppliers" ON suppliers;
CREATE POLICY "delete_suppliers" ON suppliers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- products (depends on categories, brands, suppliers)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  short_description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  cost numeric,
  sku text,
  barcode text,
  stock int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 10,
  weight numeric,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_new_arrival boolean NOT NULL DEFAULT false,
  is_flash_sale boolean NOT NULL DEFAULT false,
  flash_sale_ends_at timestamptz,
  rating numeric NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  serial_number text,
  batch_number text,
  expiry_date timestamptz,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  min_stock int NOT NULL DEFAULT 0,
  max_stock int NOT NULL DEFAULT 0,
  reorder_level int NOT NULL DEFAULT 0,
  flavor text,
  vg_pg_ratio text,
  puff_count int,
  battery_capacity_mah int,
  tank_size_ml numeric,
  resistance_ohm numeric,
  coil_compatibility text[] NOT NULL DEFAULT '{}',
  pod_compatibility text[] NOT NULL DEFAULT '{}',
  product_type text,
  is_age_restricted boolean NOT NULL DEFAULT false,
  nicotine_strength text
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE TO authenticated USING (true);

-- ============================================================
-- product_images (depends on products)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_product_images" ON product_images;
CREATE POLICY "select_product_images" ON product_images FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_product_images" ON product_images;
CREATE POLICY "insert_product_images" ON product_images FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_product_images" ON product_images;
CREATE POLICY "update_product_images" ON product_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_product_images" ON product_images;
CREATE POLICY "delete_product_images" ON product_images FOR DELETE TO authenticated USING (true);

-- ============================================================
-- branches (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  phone text,
  email text,
  manager text,
  is_active boolean NOT NULL DEFAULT true,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_branches" ON branches;
CREATE POLICY "select_branches" ON branches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_branches" ON branches;
CREATE POLICY "insert_branches" ON branches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_branches" ON branches;
CREATE POLICY "update_branches" ON branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_branches" ON branches;
CREATE POLICY "delete_branches" ON branches FOR DELETE TO authenticated USING (true);

-- ============================================================
-- warehouses (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  phone text,
  email text,
  manager text,
  capacity int,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_warehouses" ON warehouses;
CREATE POLICY "select_warehouses" ON warehouses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_warehouses" ON warehouses;
CREATE POLICY "insert_warehouses" ON warehouses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_warehouses" ON warehouses;
CREATE POLICY "update_warehouses" ON warehouses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_warehouses" ON warehouses;
CREATE POLICY "delete_warehouses" ON warehouses FOR DELETE TO authenticated USING (true);

-- ============================================================
-- inventory (depends on products, branches, warehouses)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_on_hand int NOT NULL DEFAULT 0,
  quantity_reserved int NOT NULL DEFAULT 0,
  reorder_point int NOT NULL DEFAULT 0,
  min_stock int NOT NULL DEFAULT 0,
  max_stock int NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date timestamptz,
  last_stocked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_inventory" ON inventory;
CREATE POLICY "select_inventory" ON inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_inventory" ON inventory;
CREATE POLICY "insert_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_inventory" ON inventory;
CREATE POLICY "update_inventory" ON inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_inventory" ON inventory;
CREATE POLICY "delete_inventory" ON inventory FOR DELETE TO authenticated USING (true);

-- ============================================================
-- customers (depends on auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  loyalty_points int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- addresses (depends on customers)
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_addresses" ON addresses;
CREATE POLICY "select_addresses" ON addresses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_addresses" ON addresses;
CREATE POLICY "insert_addresses" ON addresses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_addresses" ON addresses;
CREATE POLICY "update_addresses" ON addresses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_addresses" ON addresses;
CREATE POLICY "delete_addresses" ON addresses FOR DELETE TO authenticated USING (true);

-- ============================================================
-- purchase_orders (depends on suppliers, warehouses)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  shipping_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  expected_at timestamptz,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchase_orders" ON purchase_orders;
CREATE POLICY "select_purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_purchase_orders" ON purchase_orders;
CREATE POLICY "insert_purchase_orders" ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_purchase_orders" ON purchase_orders;
CREATE POLICY "update_purchase_orders" ON purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_purchase_orders" ON purchase_orders;
CREATE POLICY "delete_purchase_orders" ON purchase_orders FOR DELETE TO authenticated USING (true);

-- ============================================================
-- purchase_order_items (depends on purchase_orders, products)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  received_quantity int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_purchase_order_items" ON purchase_order_items;
CREATE POLICY "select_purchase_order_items" ON purchase_order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_purchase_order_items" ON purchase_order_items;
CREATE POLICY "insert_purchase_order_items" ON purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_purchase_order_items" ON purchase_order_items;
CREATE POLICY "update_purchase_order_items" ON purchase_order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_purchase_order_items" ON purchase_order_items;
CREATE POLICY "delete_purchase_order_items" ON purchase_order_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- orders (depends on customers)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_total numeric NOT NULL DEFAULT 0,
  shipping_total numeric NOT NULL DEFAULT 0,
  tax_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  tracking_number text,
  carrier text,
  notes text,
  placed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_orders" ON orders;
CREATE POLICY "delete_orders" ON orders FOR DELETE TO authenticated USING (true);

-- ============================================================
-- order_items (depends on orders, products)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_name text,
  sku text,
  price numeric NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  line_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_order_items" ON order_items;
CREATE POLICY "select_order_items" ON order_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_order_items" ON order_items;
CREATE POLICY "insert_order_items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_order_items" ON order_items;
CREATE POLICY "update_order_items" ON order_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_order_items" ON order_items;
CREATE POLICY "delete_order_items" ON order_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- roles (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_roles" ON roles;
CREATE POLICY "select_roles" ON roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_roles" ON roles;
CREATE POLICY "insert_roles" ON roles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_roles" ON roles;
CREATE POLICY "update_roles" ON roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_roles" ON roles;
CREATE POLICY "delete_roles" ON roles FOR DELETE TO authenticated USING (true);

-- ============================================================
-- employees (depends on auth.users, branches)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text,
  status text NOT NULL DEFAULT 'active',
  hire_date date,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_employees" ON employees;
CREATE POLICY "select_employees" ON employees FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_employees" ON employees;
CREATE POLICY "insert_employees" ON employees FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_employees" ON employees;
CREATE POLICY "update_employees" ON employees FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_employees" ON employees;
CREATE POLICY "delete_employees" ON employees FOR DELETE TO authenticated USING (true);

-- ============================================================
-- employee_roles (depends on employees, roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS employee_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, role_id)
);
ALTER TABLE employee_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_employee_roles" ON employee_roles;
CREATE POLICY "select_employee_roles" ON employee_roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_employee_roles" ON employee_roles;
CREATE POLICY "insert_employee_roles" ON employee_roles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_employee_roles" ON employee_roles;
CREATE POLICY "update_employee_roles" ON employee_roles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_employee_roles" ON employee_roles;
CREATE POLICY "delete_employee_roles" ON employee_roles FOR DELETE TO authenticated USING (true);

-- ============================================================
-- notifications (depends on auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_notifications" ON notifications;
CREATE POLICY "delete_notifications" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- reports (no FK deps)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL,
  is_scheduled boolean NOT NULL DEFAULT false,
  schedule_cron text,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reports" ON reports;
CREATE POLICY "select_reports" ON reports FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_reports" ON reports;
CREATE POLICY "insert_reports" ON reports FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_reports" ON reports;
CREATE POLICY "update_reports" ON reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_reports" ON reports;
CREATE POLICY "delete_reports" ON reports FOR DELETE TO authenticated USING (true);

-- ============================================================
-- tasks (depends on employees, auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  assigned_to uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_tasks" ON tasks;
CREATE POLICY "insert_tasks" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks FOR DELETE TO authenticated USING (true);

-- ============================================================
-- stock_transfers (depends on auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  source_type text NOT NULL DEFAULT 'warehouse',
  source_id uuid NOT NULL,
  destination_type text NOT NULL DEFAULT 'branch',
  destination_id uuid NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_stock_transfers" ON stock_transfers;
CREATE POLICY "select_stock_transfers" ON stock_transfers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_stock_transfers" ON stock_transfers;
CREATE POLICY "insert_stock_transfers" ON stock_transfers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_stock_transfers" ON stock_transfers;
CREATE POLICY "update_stock_transfers" ON stock_transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_stock_transfers" ON stock_transfers;
CREATE POLICY "delete_stock_transfers" ON stock_transfers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- stock_transfer_items (depends on stock_transfers, products)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity int NOT NULL DEFAULT 1,
  received_quantity int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "select_stock_transfer_items" ON stock_transfer_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "insert_stock_transfer_items" ON stock_transfer_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "update_stock_transfer_items" ON stock_transfer_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_stock_transfer_items" ON stock_transfer_items;
CREATE POLICY "delete_stock_transfer_items" ON stock_transfer_items FOR DELETE TO authenticated USING (true);

-- ============================================================
-- push_tokens (depends on auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_push_tokens" ON push_tokens;
CREATE POLICY "select_own_push_tokens" ON push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_push_tokens" ON push_tokens;
CREATE POLICY "insert_own_push_tokens" ON push_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_push_tokens" ON push_tokens;
CREATE POLICY "update_own_push_tokens" ON push_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_push_tokens" ON push_tokens;
CREATE POLICY "delete_own_push_tokens" ON push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket for avatars
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_id ON inventory(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_roles_employee_id ON employee_roles(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_status ON stock_transfers(status);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_items_transfer_id ON stock_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);