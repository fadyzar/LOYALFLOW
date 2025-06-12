/*
  # Update user metadata handling

  1. Changes
    - Update auth.handle_new_user() to store complete metadata
    - Add function to fix metadata for existing users
    - Add trigger for user metadata updates

  2. Metadata Structure
    - business_id: UUID of user's business
    - business_name: Name of the business
    - phone: User's phone number
    - role: User's role (admin/staff)
    - created_at: Account creation timestamp
    - settings: User preferences
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_business_id uuid;
  business_name text;
  user_phone text;
  creation_time timestamptz;
BEGIN
  -- Get data from raw_user_meta_data with improved defaults
  business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    'העסק של ' || split_part(NEW.email, '@', 1)
  );
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  creation_time := now();

  -- Create new business
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings
  )
  VALUES (
    business_name,
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    '{"theme": "light", "notifications": true}'::jsonb
  )
  RETURNING id INTO new_business_id;

  -- Create user record with complete metadata
  INSERT INTO public.users (
    id,
    email,
    phone,
    role,
    business_id,
    metadata,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    user_phone,
    'admin',
    new_business_id,
    jsonb_build_object(
      'business_id', new_business_id,
      'business_name', business_name,
      'phone', user_phone,
      'role', 'admin',
      'created_at', creation_time,
      'settings', jsonb_build_object(
        'theme', 'light',
        'notifications', true,
        'language', 'he'
      )
    ),
    creation_time
  );

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'business_id', new_business_id,
    'business_name', business_name,
    'phone', user_phone,
    'role', 'admin',
    'created_at', creation_time,
    'settings', jsonb_build_object(
      'theme', 'light',
      'notifications', true,
      'language', 'he'
    )
  )
  WHERE id = NEW.id;

  -- Create default branch
  INSERT INTO public.branches (
    business_id,
    name,
    location
  ) VALUES (
    new_business_id,
    'סניף ראשי',
    '{"address": "", "city": "", "country": "IL"}'::jsonb
  );

  -- Create default service
  INSERT INTO public.services (
    business_id,
    name,
    name_he,
    price,
    duration
  ) VALUES (
    new_business_id,
    'Basic Service',
    'שירות בסיסי',
    100,
    interval '30 minutes'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Create function to fix metadata for existing users
CREATE OR REPLACE FUNCTION fix_existing_users_metadata()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.raw_user_meta_data,
      pu.business_id,
      pu.phone,
      pu.role,
      pu.created_at,
      b.name as business_name
    FROM auth.users u
    JOIN public.users pu ON u.id = pu.id
    JOIN public.businesses b ON pu.business_id = b.id
  LOOP
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'business_id', user_record.business_id,
      'business_name', user_record.business_name,
      'phone', COALESCE(user_record.phone, ''),
      'role', user_record.role,
      'created_at', user_record.created_at,
      'settings', COALESCE(
        user_record.raw_user_meta_data->'settings',
        jsonb_build_object(
          'theme', 'light',
          'notifications', true,
          'language', 'he'
        )
      )
    )
    WHERE id = user_record.id;

    -- Update public.users metadata
    UPDATE public.users
    SET metadata = jsonb_build_object(
      'business_id', user_record.business_id,
      'business_name', user_record.business_name,
      'phone', COALESCE(user_record.phone, ''),
      'role', user_record.role,
      'created_at', user_record.created_at,
      'settings', COALESCE(
        user_record.raw_user_meta_data->'settings',
        jsonb_build_object(
          'theme', 'light',
          'notifications', true,
          'language', 'he'
        )
      )
    )
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the fix for existing users
SELECT fix_existing_users_metadata();