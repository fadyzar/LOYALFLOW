-- Create storage bucket for profile images if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profiles'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('profiles', 'profiles', true);
  END IF;
END $$;

-- Allow authenticated users to upload profile images
CREATE POLICY "Allow authenticated users to upload profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read profile images
CREATE POLICY "Allow authenticated users to read profile images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'profiles');

-- Allow users to delete their own profile images
CREATE POLICY "Allow users to delete their own profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profiles');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Fix staff_hours update logic
CREATE OR REPLACE FUNCTION update_staff_hours()
RETURNS trigger AS $$
BEGIN
  -- Delete existing hours first
  DELETE FROM staff_hours WHERE staff_id = NEW.staff_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle staff_hours updates
DROP TRIGGER IF EXISTS handle_staff_hours_update ON staff_hours;
CREATE TRIGGER handle_staff_hours_update
  BEFORE INSERT ON staff_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_hours();