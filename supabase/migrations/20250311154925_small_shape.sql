/*
  # Update chat recordings storage policies

  1. Changes
    - Updates RLS policies for chat_recordings bucket
    - Fixes folder structure permissions
    - Adds proper public access policy
  
  2. Security
    - Ensures users can only manage their own recordings
    - Maintains public read access for shared recordings
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Users can manage their recordings" ON storage.objects;
  DROP POLICY IF EXISTS "Public can read recordings" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Allow authenticated users to upload recordings to their folder
CREATE POLICY "Users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to manage their recordings
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