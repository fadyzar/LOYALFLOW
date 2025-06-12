-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to signatures" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own signatures" ON storage.objects;

-- Create policies for signatures bucket with public access
CREATE POLICY "Allow authenticated users to upload signatures"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
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

-- Update bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'signatures';

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;