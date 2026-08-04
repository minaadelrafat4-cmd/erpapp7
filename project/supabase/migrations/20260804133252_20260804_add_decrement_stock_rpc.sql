/*
# Add decrement_product_stock RPC

## Purpose
Creates an RPC function that atomically decrements product stock when a POS sale is completed. Prevents overselling by checking that sufficient stock exists.

## Security
- SECURITY INVOKER, search_path = public
- Executable by authenticated only (staff perform POS sales)
*/

CREATE OR REPLACE FUNCTION decrement_product_stock(p_product_id uuid, p_quantity int)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock = stock - p_quantity,
      updated_at = now()
  WHERE id = p_product_id
    AND stock >= p_quantity;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_product_stock(uuid, int) TO authenticated;