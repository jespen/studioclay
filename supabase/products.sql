-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  image TEXT NOT NULL,
  description TEXT,
  is_new BOOLEAN DEFAULT false,
  discount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 1
);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anonymous users to read products
CREATE POLICY "Allow anonymous read access" ON products
  FOR SELECT USING (true);

-- Allow authenticated users to insert/update/delete products
CREATE POLICY "Allow authenticated users full access" ON products
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Insert sample products for development
INSERT INTO products (title, price, original_price, image, description, is_new, discount)
VALUES 
  ('BASKET WITH HANDLES', 160, NULL, '/pictures/gronvas.jpg', 'A stylish basket with handles, perfect for storage or as a decorative piece.', true, NULL),
  ('FLOWER VASE', 170, 210, '/pictures/vasmedblomma.jpg', 'Elegant flower vase with detail, ideal for fresh or dried flowers.', true, 19),
  ('DECO ACCESSORY', 35, NULL, '/pictures/ljuslykta.jpg', 'Decorative piece, adds texture and charm to any space.', false, NULL),
  ('WALL PIECE', 110, NULL, '/pictures/skålmedprickar.jpg', 'Minimalist wall decoration with clean lines for a modern aesthetic.', true, NULL),
  ('STORAGE SOLUTION', 90, NULL, '/pictures/finavaser.jpg', 'Wall-mounted storage solution with stylish design and practical function.', false, NULL),
  ('POTTERY VASE', 60, NULL, '/pictures/ljuslyktorblåa.jpg', 'Handcrafted neutral-toned pottery vase, each with unique textures and finishes.', false, NULL),
  ('DECORATIVE PIECE', 24, 30, '/pictures/skålmedprickar2.jpg', 'Elegant decorative piece, perfect as an accent for any room.', false, 20),
  ('COFFEE MUG SET', 240, NULL, '/pictures/kaffemuggar.jpg', 'Modern coffee mug set with beautiful design and practical function.', true, NULL); 