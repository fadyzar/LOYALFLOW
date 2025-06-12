-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  name text NOT NULL,
  name_he text NOT NULL,
  sku text,
  barcode text,
  price decimal(10,2) NOT NULL,
  stock_quantity integer DEFAULT 0,
  min_stock_quantity integer DEFAULT 0,
  image_url text,
  description text,
  promotion jsonb DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add validation check for promotion structure (similar to services)
ALTER TABLE products
ADD CONSTRAINT valid_product_promotion_structure
CHECK (
  promotion IS NULL OR (
    jsonb_typeof(promotion->'is_active') = 'boolean' AND
    (promotion->>'discount_type' IN ('percentage', 'fixed')) AND
    (jsonb_typeof(promotion->'discount_value') = 'number') AND
    (promotion->>'start_date' IS NULL OR (promotion->>'start_date')::timestamp IS NOT NULL) AND
    (promotion->>'end_date' IS NULL OR (promotion->>'end_date')::timestamp IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_promotion_active ON products ((promotion->>'is_active')) WHERE promotion IS NOT NULL;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their business products"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create storage bucket for product images if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'products'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('products', 'products', true);
  END IF;
END $$;

-- Create storage policies for product images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to read product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Allow users to delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- Grant permissions
GRANT ALL ON products TO authenticated;