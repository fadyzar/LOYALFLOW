-- Create storage bucket for service images if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'services'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('services', 'services', true);
  END IF;
END $$;

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'services' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read service images
CREATE POLICY "Allow authenticated users to read service images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'services');

-- Allow users to delete their own service images
CREATE POLICY "Allow users to delete their own service images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'services');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;