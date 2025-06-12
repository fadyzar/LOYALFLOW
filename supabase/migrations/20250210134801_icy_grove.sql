-- Create storage bucket for documents if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own documents" ON storage.objects;

-- Create policies for documents bucket
CREATE POLICY "Allow authenticated users to upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
  );

CREATE POLICY "Allow public access to documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'documents');

CREATE POLICY "Allow users to delete their own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Update bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'documents';

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;