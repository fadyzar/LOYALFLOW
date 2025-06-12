/*
  # Add chat recordings storage and policies

  1. Storage
    - Create chat_recordings bucket for storing audio files
    - Enable RLS and set up appropriate policies
  
  2. Security
    - Allow authenticated users to upload recordings to their folder
    - Allow users to manage their own recordings
    - Allow public access to read recordings
*/

-- Create chat_recordings bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chat_recordings'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('chat_recordings', 'chat_recordings', true);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their recordings" ON storage.objects;
DROP POLICY IF EXISTS "Public can read recordings" ON storage.objects;

-- Allow authenticated users to upload recordings to their folder
CREATE POLICY "Users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to manage their own recordings
CREATE POLICY "Users can manage their recordings"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'chat_recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to read recordings
CREATE POLICY "Public can read recordings"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'chat_recordings'
);