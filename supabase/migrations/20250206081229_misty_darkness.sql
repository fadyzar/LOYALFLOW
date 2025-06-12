-- Add new columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS contact_info jsonb DEFAULT jsonb_build_object(
  'phone', '',
  'email', '',
  'address', '',
  'city', '',
  'country', 'IL',
  'location', jsonb_build_object(
    'lat', null,
    'lng', null
  )
),
ADD COLUMN IF NOT EXISTS external_page_settings jsonb DEFAULT jsonb_build_object(
  'theme', 'light',
  'layout', 'default',
  'colors', jsonb_build_object(
    'primary', '#4F46E5',
    'secondary', '#6366F1',
    'background', '#FFFFFF',
    'text', '#1F2937'
  ),
  'fonts', jsonb_build_object(
    'heading', 'Assistant',
    'body', 'Assistant'
  ),
  'components', jsonb_build_object(
    'header', jsonb_build_object(
      'type', 'default',
      'show_logo', true,
      'show_business_name', true
    ),
    'services', jsonb_build_object(
      'type', 'grid',
      'show_prices', true,
      'show_duration', true
    ),
    'staff', jsonb_build_object(
      'type', 'cards',
      'show_specialties', true,
      'show_description', true
    ),
    'footer', jsonb_build_object(
      'type', 'default',
      'show_social_links', true,
      'show_contact_info', true
    )
  ),
  'custom_css', ''
);

-- Create storage bucket for business assets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'business_assets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('business_assets', 'business_assets', true);
  END IF;
END $$;

-- Create policies for business assets
CREATE POLICY "Allow authenticated users to upload business assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business_assets');

CREATE POLICY "Allow authenticated users to read business assets"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'business_assets');

CREATE POLICY "Allow users to delete their own business assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'business_assets');

-- Add validation function for booking link format
CREATE OR REPLACE FUNCTION validate_booking_link()
RETURNS trigger AS $$
BEGIN
  -- Check if booking_link contains only allowed characters
  IF NEW.booking_link !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'הקישור יכול להכיל רק אותיות באנגלית קטנות, מספרים ומקפים';
  END IF;

  -- Check minimum and maximum length
  IF length(NEW.booking_link) < 3 OR length(NEW.booking_link) > 50 THEN
    RAISE EXCEPTION 'אורך הקישור חייב להיות בין 3 ל-50 תווים';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking link validation
DROP TRIGGER IF EXISTS validate_booking_link_trigger ON businesses;
CREATE TRIGGER validate_booking_link_trigger
  BEFORE INSERT OR UPDATE OF booking_link ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_link();

-- Update existing businesses with default settings
UPDATE businesses
SET 
  contact_info = COALESCE(contact_info, jsonb_build_object(
    'phone', '',
    'email', '',
    'address', '',
    'city', '',
    'country', 'IL',
    'location', jsonb_build_object(
      'lat', null,
      'lng', null
    )
  )),
  external_page_settings = COALESCE(external_page_settings, jsonb_build_object(
    'theme', 'light',
    'layout', 'default',
    'colors', jsonb_build_object(
      'primary', '#4F46E5',
      'secondary', '#6366F1',
      'background', '#FFFFFF',
      'text', '#1F2937'
    ),
    'fonts', jsonb_build_object(
      'heading', 'Assistant',
      'body', 'Assistant'
    ),
    'components', jsonb_build_object(
      'header', jsonb_build_object(
        'type', 'default',
        'show_logo', true,
        'show_business_name', true
      ),
      'services', jsonb_build_object(
        'type', 'grid',
        'show_prices', true,
        'show_duration', true
      ),
      'staff', jsonb_build_object(
        'type', 'cards',
        'show_specialties', true,
        'show_description', true
      ),
      'footer', jsonb_build_object(
        'type', 'default',
        'show_social_links', true,
        'show_contact_info', true
      )
    ),
    'custom_css', ''
  ))
WHERE contact_info IS NULL OR external_page_settings IS NULL;