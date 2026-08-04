/*
# Fix Views to Use SECURITY INVOKER

## Purpose
All 9 ERP views were created with the default SECURITY DEFINER property, which means they bypass RLS on underlying tables. This migration sets them all to SECURITY INVOKER so queries through the views respect the row-level security policies on the underlying tables.

## Changes
- ALTER VIEW ... SET (security_invoker = true) on all 9 views:
  1. v_dashboard_summary
  2. v_customer_summary
  3. v_order_summary
  4. v_bi_sales_daily
  5. v_bi_inventory_value
  6. v_bi_low_stock
  7. v_bi_branch_sales
  8. v_bi_product_sales
  9. v_bi_employee_performance

## Security
- Views now run with the privileges of the querying user (INVOKER) instead of the view owner (DEFINER).
- This ensures RLS policies on products, customers, orders, etc. are enforced when querying through views.
*/

ALTER VIEW v_dashboard_summary SET (security_invoker = true);
ALTER VIEW v_customer_summary SET (security_invoker = true);
ALTER VIEW v_order_summary SET (security_invoker = true);
ALTER VIEW v_bi_sales_daily SET (security_invoker = true);
ALTER VIEW v_bi_inventory_value SET (security_invoker = true);
ALTER VIEW v_bi_low_stock SET (security_invoker = true);
ALTER VIEW v_bi_branch_sales SET (security_invoker = true);
ALTER VIEW v_bi_product_sales SET (security_invoker = true);
ALTER VIEW v_bi_employee_performance SET (security_invoker = true);