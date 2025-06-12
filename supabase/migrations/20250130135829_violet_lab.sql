-- Update users table with new columns and settings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT jsonb_build_object(
  'rest_time', 15,
  'max_daily_appointments', null,
  'visible_in_public', true
);

-- Create index for specialties array
CREATE INDEX IF NOT EXISTS idx_users_specialties ON users USING GIN (specialties);

-- Update existing users with default settings
UPDATE users
SET settings = jsonb_build_object(
  'rest_time', 15,
  'max_daily_appointments', null,
  'visible_in_public', true
)
WHERE settings IS NULL;