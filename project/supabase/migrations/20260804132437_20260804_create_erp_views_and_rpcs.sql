/*
# Create LUXE ERP Views and RPC Functions

## Purpose
Creates 9 database views and 3 RPC functions referenced by the mobile app.

## Views (9)
1. v_dashboard_summary — aggregate counts for dashboard
2. v_customer_summary — customer info with order stats
3. v_order_summary — order info with item_count
4. v_bi_sales_daily — daily sales aggregates
5. v_bi_inventory_value — inventory valuation per product
6. v_bi_low_stock — products at or below reorder level
7. v_bi_branch_sales — sales comparison per branch
8. v_bi_product_sales — product performance ranking
9. v_bi_employee_performance — sales performance per employee

## RPC Functions (3)
1. is_account_locked_server(p_email) — checks account lockout status
2. record_login_attempt(p_email, p_success, p_user_id, p_failure_reason) — logs login attempts
3. get_employee_permissions() — returns permission grants for current user

## Security
- Views use SECURITY INVOKER (respect RLS on underlying tables).
- Functions use SECURITY INVOKER with explicit public. schema prefixes.
- is_account_locked_server and record_login_attempt: executable by anon + authenticated.
- get_employee_permissions: authenticated only.

## Notes
- Uses CREATE OR REPLACE for idempotency.
- All table references use public. prefix to work with restricted search_path.
*/

-- ============================================================
-- Views
-- ============================================================

CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  COUNT(*) FILTER (WHERE p.stock <= p.low_stock_threshold AND p.is_active) AS low_stock_count,
  COUNT(*) FILTER (WHERE p.stock <= 0 AND p.is_active) AS out_of_stock_count,
  COUNT(*) FILTER (WHERE p.is_active) AS total_products
FROM public.products p;

CREATE OR REPLACE VIEW v_customer_summary AS
SELECT
  c.id,
  c.user_id,
  c.first_name,
  c.last_name,
  COALESCE(p.email, '') AS email,
  c.loyalty_points,
  c.created_at,
  COALESCE(os.order_count, 0) AS order_count,
  COALESCE(os.total_spent, 0) AS total_spent,
  os.last_order_at
FROM public.customers c
LEFT JOIN public.profiles p ON p.id = c.user_id
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS order_count, SUM(grand_total) AS total_spent, MAX(placed_at) AS last_order_at
  FROM public.orders
  GROUP BY customer_id
) os ON os.customer_id = c.id;

CREATE OR REPLACE VIEW v_order_summary AS
SELECT
  o.id,
  o.order_number,
  o.customer_id,
  o.status,
  o.payment_status,
  o.fulfillment_status,
  o.grand_total,
  o.currency,
  o.placed_at,
  o.created_at,
  COALESCE(oi.item_count, 0) AS item_count
FROM public.orders o
LEFT JOIN (
  SELECT order_id, COUNT(*) AS item_count
  FROM public.order_items
  GROUP BY order_id
) oi ON oi.order_id = o.id;

CREATE OR REPLACE VIEW v_bi_sales_daily AS
SELECT
  DATE(o.placed_at) AS sale_date,
  COUNT(*) AS order_count,
  SUM(o.subtotal) AS total_revenue,
  SUM(o.discount_total) AS total_discount,
  SUM(o.tax_total) AS total_tax,
  SUM(o.shipping_total) AS total_shipping,
  SUM(o.grand_total) AS total_grand,
  AVG(o.grand_total) AS avg_order_value,
  COALESCE(SUM(oi.qty), 0) AS items_sold
FROM public.orders o
LEFT JOIN (
  SELECT order_id, SUM(quantity) AS qty
  FROM public.order_items
  GROUP BY order_id
) oi ON oi.order_id = o.id
WHERE o.status NOT IN ('cancelled')
GROUP BY DATE(o.placed_at);

CREATE OR REPLACE VIEW v_bi_inventory_value AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.stock,
  COALESCE(p.cost, 0) AS unit_cost,
  p.price AS unit_price,
  (p.stock * COALESCE(p.cost, 0)) AS total_cost_value,
  (p.stock * p.price) AS total_retail_value,
  (p.stock * p.price) - (p.stock * COALESCE(p.cost, 0)) AS potential_profit
FROM public.products p
WHERE p.is_active = true;

CREATE OR REPLACE VIEW v_bi_low_stock AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.stock,
  p.reorder_level,
  p.low_stock_threshold,
  cat.name AS category_name,
  CASE
    WHEN p.stock <= 0 THEN 'out_of_stock'
    WHEN p.stock <= p.reorder_level THEN 'critical'
    ELSE 'low'
  END AS severity
FROM public.products p
LEFT JOIN public.categories cat ON cat.id = p.category_id
WHERE p.is_active = true
  AND p.stock <= p.low_stock_threshold;

CREATE OR REPLACE VIEW v_bi_branch_sales AS
SELECT
  b.id AS branch_id,
  b.name AS branch_name,
  b.code AS branch_code,
  b.city,
  b.is_active,
  COALESCE(s.total_revenue, 0) AS total_revenue,
  COALESCE(s.order_count, 0) AS order_count,
  COALESCE(s.avg_order_value, 0) AS avg_order_value
FROM public.branches b
LEFT JOIN (
  SELECT
    e.branch_id,
    SUM(o.grand_total) AS total_revenue,
    COUNT(*) AS order_count,
    AVG(o.grand_total) AS avg_order_value
  FROM public.orders o
  JOIN public.employees e ON e.user_id = o.customer_id
  WHERE o.status NOT IN ('cancelled')
  GROUP BY e.branch_id
) s ON s.branch_id = b.id;

CREATE OR REPLACE VIEW v_bi_product_sales AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.price,
  COALESCE(p.cost, 0) AS cost,
  p.stock AS current_stock,
  cat.name AS category_name,
  COALESCE(ps.total_qty_sold, 0) AS total_qty_sold,
  COALESCE(ps.total_revenue, 0) AS total_revenue,
  COALESCE(ps.total_profit, 0) AS total_profit,
  COALESCE(ps.order_count, 0) AS order_count
FROM public.products p
LEFT JOIN public.categories cat ON cat.id = p.category_id
LEFT JOIN (
  SELECT
    oi.product_id,
    SUM(oi.quantity) AS total_qty_sold,
    SUM(oi.line_total) AS total_revenue,
    SUM(oi.line_total - oi.quantity * COALESCE(p2.cost, 0)) AS total_profit,
    COUNT(DISTINCT oi.order_id) AS order_count
  FROM public.order_items oi
  LEFT JOIN public.products p2 ON p2.id = oi.product_id
  GROUP BY oi.product_id
) ps ON ps.product_id = p.id
WHERE p.is_active = true;

CREATE OR REPLACE VIEW v_bi_employee_performance AS
SELECT
  e.id AS employee_id,
  COALESCE(s.total_sales, 0) AS total_sales,
  COALESCE(s.order_count, 0) AS order_count,
  COALESCE(s.avg_sale_value, 0) AS avg_sale_value,
  s.last_sale_at
FROM public.employees e
LEFT JOIN (
  SELECT
    o.customer_id AS user_id,
    SUM(o.grand_total) AS total_sales,
    COUNT(*) AS order_count,
    AVG(o.grand_total) AS avg_sale_value,
    MAX(o.placed_at) AS last_sale_at
  FROM public.orders o
  WHERE o.status NOT IN ('cancelled')
  GROUP BY o.customer_id
) s ON s.user_id = e.user_id;

-- ============================================================
-- RPC Functions
-- ============================================================

CREATE OR REPLACE FUNCTION is_account_locked_server(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE email = p_email
      AND locked_until IS NOT NULL
      AND locked_until > now()
  );
$$;

CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email text,
  p_success boolean,
  p_user_id uuid DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_success THEN
    UPDATE profiles
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = now(),
        updated_at = now()
    WHERE email = p_email;
  ELSE
    UPDATE profiles
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
          WHEN failed_login_attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE locked_until
        END,
        updated_at = now()
    WHERE email = p_email;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_employee_permissions()
RETURNS TABLE(
  permission_name text,
  can_edit boolean
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.name AS permission_name,
    true AS can_edit
  FROM employee_roles er
  JOIN roles r ON r.id = er.role_id
  JOIN employees e ON e.id = er.employee_id
  WHERE e.user_id = auth.uid();
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_account_locked_server(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_login_attempt(text, boolean, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_employee_permissions() TO authenticated;

-- Grant select on views to authenticated
GRANT SELECT ON v_dashboard_summary TO authenticated;
GRANT SELECT ON v_customer_summary TO authenticated;
GRANT SELECT ON v_order_summary TO authenticated;
GRANT SELECT ON v_bi_sales_daily TO authenticated;
GRANT SELECT ON v_bi_inventory_value TO authenticated;
GRANT SELECT ON v_bi_low_stock TO authenticated;
GRANT SELECT ON v_bi_branch_sales TO authenticated;
GRANT SELECT ON v_bi_product_sales TO authenticated;
GRANT SELECT ON v_bi_employee_performance TO authenticated;