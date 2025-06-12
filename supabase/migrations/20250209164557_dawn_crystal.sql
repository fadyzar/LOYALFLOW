-- Create storage bucket for signatures if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'signatures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('signatures', 'signatures', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own signatures" ON storage.objects;

-- Create policies for signatures bucket
CREATE POLICY "Allow authenticated users to upload signatures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Allow public access to signatures"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'signatures');

CREATE POLICY "Allow users to delete their own signatures"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;