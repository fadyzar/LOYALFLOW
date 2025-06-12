-- Create storage bucket for external page assets if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'external_page'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('external_page', 'external_page', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload external page assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to external page assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own external page assets" ON storage.objects;

-- Create policies for external_page bucket
CREATE POLICY "Allow authenticated users to upload external page assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'external_page'
  );

CREATE POLICY "Allow public access to external page assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'external_page');

CREATE POLICY "Allow users to delete their own external page assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'external_page' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Update bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'external_page';

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;