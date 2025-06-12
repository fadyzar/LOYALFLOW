-- Add new columns to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS legal_name text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS signature_url text;

-- Create storage bucket for signatures if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'signatures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'signatures', false);
  END IF;
END $$;

-- Create policies for signatures bucket
CREATE POLICY "Allow authenticated users to upload signatures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow users to read their own business signatures"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow users to delete their own business signatures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Add validation for tax_id format
CREATE OR REPLACE FUNCTION validate_tax_id()
RETURNS trigger AS $$
BEGIN
  -- Check if tax_id is provided and validate format
  IF NEW.tax_id IS NOT NULL THEN
    -- Check if tax_id contains only digits
    IF NEW.tax_id !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'מספר עוסק/ח.פ חייב להכיל ספרות בלבד';
    END IF;

    -- Check length (9 digits for both עוסק מורשה and ח.פ)
    IF length(NEW.tax_id) != 9 THEN
      RAISE EXCEPTION 'מספר עוסק/ח.פ חייב להכיל 9 ספרות';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tax_id validation
CREATE TRIGGER validate_tax_id_trigger
  BEFORE INSERT OR UPDATE OF tax_id ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION validate_tax_id();

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;