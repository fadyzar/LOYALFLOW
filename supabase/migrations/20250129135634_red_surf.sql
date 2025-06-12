/*
  # Add new fields to services table

  1. New Fields
    - `image_url` (text, nullable) - URL of service image
    - `description` (text, nullable) - Optional service description
    - `promotion` (jsonb, nullable) - Promotion details with structure:
      {
        is_active: boolean,
        discount_type: "percentage" | "fixed",
        discount_value: number,
        start_date: timestamp,
        end_date: timestamp
      }

  2. Changes
    - Add new columns with default values
    - Add validation check for promotion structure
*/

-- Add new columns
ALTER TABLE services
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS promotion jsonb DEFAULT NULL;

-- Add validation check for promotion structure
ALTER TABLE services
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

-- Add index for promotion status
CREATE INDEX idx_services_promotion_active ON services ((promotion->>'is_active')) WHERE promotion IS NOT NULL;