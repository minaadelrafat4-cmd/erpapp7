DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@luxe.co';
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'admin@luxe.co', crypt('LuxeAdmin2026!', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', false
    ) RETURNING id INTO v_user_id;
  END IF;

  INSERT INTO profiles (id, email, full_name, role, status)
  VALUES (v_user_id, 'admin@luxe.co', 'LUXE Administrator', 'super_admin', 'active')
  ON CONFLICT (id) DO NOTHING;
END $$;

INSERT INTO categories (id, name, slug, description, is_featured, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Vape Devices', 'vape-devices', 'Electronic cigarettes, mods, and pod systems', true, 1),
  ('a0000000-0000-0000-0000-000000000002', 'E-Liquids', 'e-liquids', 'Premium e-liquid and juice collections', true, 2)
ON CONFLICT DO NOTHING;

INSERT INTO brands (id, name, slug, description, country, is_featured) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Vaporesso', 'vaporesso', 'Leading vape device manufacturer', 'China', true),
  ('b0000000-0000-0000-0000-000000000002', 'Naked 100', 'naked-100', 'Premium e-liquid brand', 'USA', true)
ON CONFLICT DO NOTHING;

INSERT INTO suppliers (id, name, contact_name, email, phone, address, city, country, payment_terms, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Global Vape Distribution', 'John Smith', 'orders@globalvape.com', '+1-555-0100', '123 Industry Blvd', 'Los Angeles', 'USA', 'Net 30', true),
  ('c0000000-0000-0000-0000-000000000002', 'Premium E-Liquid Co.', 'Sarah Johnson', 'sales@premiumeliquid.com', '+1-555-0200', '456 Commerce St', 'Miami', 'USA', 'Net 15', true)
ON CONFLICT DO NOTHING;

INSERT INTO branches (id, name, code, address, city, phone, email, manager, is_active, state, postal_code) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Downtown Flagship', 'DT-001', '500 Main Street', 'New York', '+1-212-555-0100', 'downtown@luxe.co', 'Mike Chen', true, 'NY', '10001'),
  ('d0000000-0000-0000-0000-000000000002', 'Westside Mall', 'WS-002', '200 Mall Blvd', 'Los Angeles', '+1-310-555-0200', 'westside@luxe.co', 'Lisa Park', true, 'CA', '90064')
ON CONFLICT DO NOTHING;

INSERT INTO warehouses (id, name, code, address, city, state, postal_code, phone, email, manager, capacity, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Central Distribution Center', 'WH-001', '100 Logistics Way', 'Newark', 'NJ', '07101', '+1-973-555-0100', 'warehouse@luxe.co', 'Tom Garcia', 50000, true),
  ('e0000000-0000-0000-0000-000000000002', 'West Coast Hub', 'WH-002', '300 Port Dr', 'Long Beach', 'CA', '90802', '+1-562-555-0200', 'westhub@luxe.co', 'Anna Lee', 30000, true)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, name, slug, description, short_description, category_id, brand_id, price, compare_at_price, cost, sku, barcode, stock, low_stock_threshold, is_featured, is_best_seller, is_active, tags, supplier_id, min_stock, reorder_level, flavor, vg_pg_ratio, puff_count, battery_capacity_mah, product_type, is_age_restricted, nicotine_strength) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'Vaporesso XROS 4 Pod Kit', 'vaporesso-xros-4', 'The XROS 4 features a 1000mAh battery, adjustable airflow, and compatibility with all XROS pods.', 'Compact pod kit with long battery life', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 39.99, 49.99, 22.00, 'VAP-XROS4-BL', '6941714623123', 45, 10, true, true, true, ARRAY['pod-kit', 'compact', 'beginner'], 'c0000000-0000-0000-0000-000000000001', 15, 20, NULL, '50/50', NULL, 1000, 'Pod System', true, NULL),
  ('f0000000-0000-0000-0000-000000000002', 'Vaporesso LUXE XR Max', 'vaporesso-luxe-xr-max', '80W pod mod with 2000mAh battery and AXON chip.', 'High-powered pod mod', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 59.99, 69.99, 35.00, 'VAP-LUXE-XR-MAX', '6941714623456', 28, 8, true, false, true, ARRAY['pod-mod', 'high-wattage'], 'c0000000-0000-0000-0000-000000000001', 10, 15, NULL, NULL, NULL, 2000, 'Pod Mod', true, NULL),
  ('f0000000-0000-0000-0000-000000000003', 'Naked 100 Hawaiian Pog', 'naked-100-hawaiian-pog', 'A tropical blend of passion fruit, orange, and guava.', 'Tropical fruit e-liquid', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 24.99, 29.99, 12.00, 'NK100-HP-60', '810029040123', 120, 20, true, true, true, ARRAY['fruit', 'tropical', '60ml'], 'c0000000-0000-0000-0000-000000000002', 30, 40, 'Passion Fruit, Orange, Guava', '70/30', NULL, NULL, 'E-Liquid', true, '3mg'),
  ('f0000000-0000-0000-0000-000000000004', 'Naked 100 Lava Flow', 'naked-100-lava-flow', 'Strawberry, coconut, and pineapple island flavor.', 'Island fruit e-liquid', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 24.99, 29.99, 12.00, 'NK100-LF-60', '810029040456', 85, 20, false, true, true, ARRAY['fruit', 'island', '60ml'], 'c0000000-0000-0000-0000-000000000002', 30, 40, 'Strawberry, Coconut, Pineapple', '70/30', NULL, NULL, 'E-Liquid', true, '3mg'),
  ('f0000000-0000-0000-0000-000000000005', 'Vaporesso GEN 200 Box Mod', 'vaporesso-gen-200', '200W dual-battery box mod with AXON 2.0 chip.', 'Powerful dual-battery mod', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 49.99, 59.99, 28.00, 'VAP-GEN200-BK', '6941714623789', 15, 5, false, false, true, ARRAY['box-mod', 'dual-battery'], 'c0000000-0000-0000-0000-000000000001', 8, 10, NULL, NULL, NULL, NULL, 'Box Mod', true, NULL),
  ('f0000000-0000-0000-0000-000000000006', 'Naked 100 Brain Freeze', 'naked-100-brain-freeze', 'Strawberry, kiwi, and pomegranate with menthol.', 'Menthol fruit e-liquid', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 24.99, 29.99, 12.00, 'NK100-BF-60', '810029040789', 5, 20, true, false, true, ARRAY['menthol', 'fruit', '60ml'], 'c0000000-0000-0000-0000-000000000002', 30, 40, 'Strawberry, Kiwi, Pomegranate, Menthol', '70/30', NULL, NULL, 'E-Liquid', true, '6mg')
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, url, alt, sort_order) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e1?w=400', 'Vaporesso XROS 4', 0),
  ('f0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e2?w=400', 'Vaporesso LUXE XR Max', 0),
  ('f0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e3?w=400', 'Naked 100 Hawaiian Pog', 0),
  ('f0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e4?w=400', 'Naked 100 Lava Flow', 0),
  ('f0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e5?w=400', 'Vaporesso GEN 200', 0),
  ('f0000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1613258445546-e1f6e1a3b1e6?w=400', 'Naked 100 Brain Freeze', 0)
ON CONFLICT DO NOTHING;

INSERT INTO inventory (product_id, branch_id, warehouse_id, quantity_on_hand, reorder_point, min_stock, max_stock) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', NULL, 20, 10, 5, 100),
  ('f0000000-0000-0000-0000-000000000003', NULL, 'e0000000-0000-0000-0000-000000000001', 80, 30, 20, 200),
  ('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', NULL, 3, 20, 10, 50)
ON CONFLICT DO NOTHING;

INSERT INTO roles (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin', 'Full system access'),
  ('10000000-0000-0000-0000-000000000002', 'manager', 'Store management access'),
  ('10000000-0000-0000-0000-000000000003', 'staff', 'Basic staff access')
ON CONFLICT DO NOTHING;

INSERT INTO employees (user_id, first_name, last_name, email, phone, position, status, hire_date, branch_id)
SELECT id, 'LUXE', 'Administrator', 'admin@luxe.co', '+1-555-0000', 'System Administrator', 'active', '2024-01-01', 'd0000000-0000-0000-0000-000000000001'
FROM profiles WHERE email = 'admin@luxe.co'
ON CONFLICT DO NOTHING;

INSERT INTO employee_roles (employee_id, role_id)
SELECT e.id, '10000000-0000-0000-0000-000000000001'
FROM employees e
JOIN profiles p ON p.id = e.user_id
WHERE p.email = 'admin@luxe.co'
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_customer_user_id uuid;
BEGIN
  SELECT id INTO v_customer_user_id FROM auth.users WHERE email = 'customer@luxe.co';
  IF v_customer_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'customer@luxe.co', crypt('LuxeCustomer2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}', false
    ) RETURNING id INTO v_customer_user_id;
  END IF;

  INSERT INTO customers (user_id, first_name, last_name, phone, marketing_opt_in, loyalty_points)
  VALUES (v_customer_user_id, 'Jane', 'Doe', '+1-555-1234', true, 250)
  ON CONFLICT DO NOTHING;
END $$;

INSERT INTO purchase_orders (id, po_number, supplier_id, warehouse_id, status, subtotal, tax_total, shipping_total, grand_total, currency, expected_at, notes) VALUES
  ('11000000-0000-0000-0000-000000000001', 'PO-2026-0001', 'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'received', 2200.00, 176.00, 50.00, 2426.00, 'USD', '2026-07-15T00:00:00Z', 'Restock of pod kits'),
  ('11000000-0000-0000-0000-000000000002', 'PO-2026-0002', 'c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'ordered', 1800.00, 144.00, 30.00, 1974.00, 'USD', '2026-08-10T00:00:00Z', 'E-liquid restock')
ON CONFLICT DO NOTHING;

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, line_total, received_quantity) VALUES
  ('11000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 50, 22.00, 1100.00, 50),
  ('11000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 30, 35.00, 1050.00, 30),
  ('11000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 100, 12.00, 1200.00, 0),
  ('11000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004', 50, 12.00, 600.00, 0)
ON CONFLICT DO NOTHING;

INSERT INTO orders (id, order_number, customer_id, status, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, tax_total, grand_total, currency, placed_at) VALUES
  ('12000000-0000-0000-0000-000000000001', 'SO-2026-0001', (SELECT id FROM customers WHERE first_name = 'Jane' LIMIT 1), 'fulfilled', 'paid', 'fulfilled', 64.98, 0, 5.99, 5.20, 76.17, 'USD', '2026-07-20T14:30:00Z'),
  ('12000000-0000-0000-0000-000000000002', 'SO-2026-0002', (SELECT id FROM customers WHERE first_name = 'Jane' LIMIT 1), 'pending', 'paid', 'unfulfilled', 49.99, 0, 0, 4.00, 53.99, 'USD', '2026-08-01T10:15:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, product_name, sku, price, quantity, line_total) VALUES
  ('12000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Vaporesso XROS 4 Pod Kit', 'VAP-XROS4-BL', 39.99, 1, 39.99),
  ('12000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 'Naked 100 Hawaiian Pog', 'NK100-HP-60', 24.99, 1, 24.99),
  ('12000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 'Vaporesso LUXE XR Max', 'VAP-LUXE-XR-MAX', 49.99, 1, 49.99),
  ('12000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000006', 'Naked 100 Brain Freeze', 'NK100-BF-60', 24.99, 0, 0)
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
  ((SELECT id FROM profiles WHERE email = 'admin@luxe.co'), 'Low Stock Alert', 'Naked 100 Brain Freeze is below reorder level (5 units left).', 'warning', false),
  ((SELECT id FROM profiles WHERE email = 'admin@luxe.co'), 'New Order Received', 'Order SO-2026-0002 has been placed and awaits fulfillment.', 'info', false),
  ((SELECT id FROM profiles WHERE email = 'admin@luxe.co'), 'Purchase Order Received', 'PO-2026-0001 has been fully received at Central Distribution Center.', 'success', true)
ON CONFLICT DO NOTHING;

INSERT INTO reports (name, description, type, is_scheduled, schedule_cron, last_run_at) VALUES
  ('Monthly Sales Summary', 'Total revenue, orders, and top products for the month', 'sales', true, '0 8 1 * *', '2026-08-01T08:00:00Z'),
  ('Inventory Valuation', 'Current stock value at cost and retail across all locations', 'inventory', true, '0 0 * * 1', '2026-08-04T00:00:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, created_by) VALUES
  ('Restock Brain Freeze E-Liquid', 'Place a purchase order for Naked 100 Brain Freeze - critically low at 5 units.', 'pending', 'high', '2026-08-06T17:00:00Z', (SELECT id FROM employees WHERE email = 'admin@luxe.co'), (SELECT id FROM profiles WHERE email = 'admin@luxe.co')),
  ('Fulfill Order SO-2026-0002', 'Pack and ship the pending order for Jane Doe.', 'in_progress', 'medium', '2026-08-05T17:00:00Z', (SELECT id FROM employees WHERE email = 'admin@luxe.co'), (SELECT id FROM profiles WHERE email = 'admin@luxe.co')),
  ('Monthly Inventory Audit', 'Conduct full physical inventory count at Downtown Flagship.', 'pending', 'low', '2026-08-15T17:00:00Z', (SELECT id FROM employees WHERE email = 'admin@luxe.co'), (SELECT id FROM profiles WHERE email = 'admin@luxe.co'))
ON CONFLICT DO NOTHING;

INSERT INTO stock_transfers (id, transfer_number, status, source_type, source_id, destination_type, destination_id, notes, created_by) VALUES
  ('13000000-0000-0000-0000-000000000001', 'ST-2026-0001', 'completed', 'warehouse', 'e0000000-0000-0000-0000-000000000001', 'branch', 'd0000000-0000-0000-0000-000000000001', 'Restock XROS 4 to Downtown', (SELECT id FROM profiles WHERE email = 'admin@luxe.co'))
ON CONFLICT DO NOTHING;

INSERT INTO stock_transfer_items (transfer_id, product_id, quantity, received_quantity) VALUES
  ('13000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 20, 20),
  ('13000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 10, 10)
ON CONFLICT DO NOTHING;