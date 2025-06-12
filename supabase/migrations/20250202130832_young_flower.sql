-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create simplified function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_business_id uuid;
  business_name text;
  user_phone text;
BEGIN
  -- Get data from raw_user_meta_data
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'העסק של ' || split_part(NEW.email, '@', 1));
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Step 1: Create business first
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings
  )
  VALUES (
    business_name,
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    jsonb_build_object(
      'theme', 'light',
      'notifications', true,
      'language', 'he'
    )
  )
  RETURNING id INTO new_business_id;

  -- Step 2: Create user record
  INSERT INTO public.users (
    id,
    email,
    phone,
    role,
    business_id,
    metadata
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
      'created_at', now()
    )
  );

  -- Step 3: Create default branch
  INSERT INTO public.branches (
    business_id,
    name,
    location
  ) VALUES (
    new_business_id,
    'סניף ראשי',
    jsonb_build_object(
      'address', '',
      'city', '',
      'country', 'IL'
    )
  );

  -- Step 4: Create default service
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

  -- Step 5: Create default business hours
  INSERT INTO public.business_hours (
    business_id,
    regular_hours,
    special_dates
  ) VALUES (
    new_business_id,
    jsonb_build_object(
      'sunday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'monday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'tuesday',   jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'wednesday', jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'thursday',  jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'friday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'saturday',  jsonb_build_object('is_active', false, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb)
    ),
    '[]'::jsonb
  );

  -- Step 6: Create registration record
  INSERT INTO registration_steps (
    user_id,
    type,
    business_id,
    current_step,
    steps_data,
    completed_steps,
    completed_at
  ) VALUES (
    NEW.id,
    'business',
    new_business_id,
    1,
    jsonb_build_object(
      '1', jsonb_build_object(
        'email', NEW.email,
        'phone', user_phone
      )
    ),
    ARRAY[1],
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();