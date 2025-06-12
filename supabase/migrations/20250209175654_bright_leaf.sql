-- Add promotion column to invoice_items table
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS promotion jsonb DEFAULT NULL;

-- Add validation check for promotion structure
ALTER TABLE invoice_items
ADD CONSTRAINT valid_promotion_structure
CHECK (
  promotion IS NULL OR (
    jsonb_typeof(promotion->'is_active') = 'boolean' AND
    (promotion->>'discount_type' IN ('percentage', 'fixed')) AND
    (jsonb_typeof(promotion->'discount_value') = 'number') AND
    (promotion->>'start_date' IS NULL OR (promotion->>'start_date')::timestamp IS NOT NULL) AND
    (promotion->>'end_date' IS NULL OR (promotion->>'end_date')::timestamp IS NOT NULL)
  )
);

-- Create index for promotion status
CREATE INDEX IF NOT EXISTS idx_invoice_items_promotion_active 
ON invoice_items ((promotion->>'is_active')) 
WHERE promotion IS NOT NULL;