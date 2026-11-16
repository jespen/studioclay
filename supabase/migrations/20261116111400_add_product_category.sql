ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other';

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE public.products
ADD CONSTRAINT products_category_check
CHECK (category IN ('vase', 'bowl', 'artwork', 'jar', 'lantern', 'other'));

UPDATE public.products
SET category = CASE
  WHEN title ILIKE '%skål%' THEN 'bowl'
  WHEN title ILIKE '%burk%' THEN 'jar'
  WHEN title ILIKE '%ljuslykta%' OR title ILIKE '%aromalampa%' THEN 'lantern'
  WHEN title ILIKE '%vas%' THEN 'vase'
  WHEN title ILIKE '%blomboll%' OR title ILIKE '%reverie%' THEN 'artwork'
  WHEN description ILIKE '%skulptural vas%' OR description ILIKE '%keramikvas%' THEN 'vase'
  ELSE 'other'
END;
