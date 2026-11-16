CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  image text,
  stock_quantity integer,
  in_stock boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  UPDATE public.products AS product
  SET
    stock_quantity = product.stock_quantity - 1,
    in_stock = (product.stock_quantity - 1) > 0,
    updated_at = now()
  WHERE product.id = p_product_id
    AND product.stock_quantity > 0
  RETURNING
    product.id,
    product.title,
    product.description,
    product.price,
    product.image,
    product.stock_quantity,
    product.in_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.decrement_product_stock(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid) TO service_role;
