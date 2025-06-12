/*
  # Create chat recordings storage setup
  
  1. Storage
    - Creates chat_recordings bucket
    - Configures public file access
  
  2. Security
    - Drops existing policies if they exist
    - Creates new RLS policies for:
      - User uploads to their folders
      - User management of their recordings
      - Public read access
*/

-- Create chat_recordings bucket if it doesn't exist
DO $$ 
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat_recordings'
  ) INTO bucket_exists;

  IF NOT bucket_exists THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('chat_recordings', 'chat_recordings', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Users can manage their recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Public can read recordings" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Allow authenticated users to upload recordings to their folder
CREATE POLICY "Users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to manage their own recordings
CREATE POLICY "Users can manage their recordings"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'chat_recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to read recordings
CREATE POLICY "Public can read recordings"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'chat_recordings'
);