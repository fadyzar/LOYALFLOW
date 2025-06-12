/*
  # Create chat recordings bucket and policies

  1. New Storage Bucket
    - Creates chat_recordings bucket for storing audio messages
    - Configures public access for recordings
  
  2. Security
    - Enables RLS
    - Adds policies for authenticated users to manage their recordings
    - Adds policy for public access to recordings
*/

-- Create the chat_recordings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_recordings', 'chat_recordings', true);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload recordings
CREATE POLICY "Users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to manage their recordings
CREATE POLICY "Users can manage their recordings"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'chat_recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to recordings
CREATE POLICY "Public can read recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat_recordings');