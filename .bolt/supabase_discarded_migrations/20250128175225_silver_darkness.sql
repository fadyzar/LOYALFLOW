-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create registration log table if not exists
CREATE TABLE IF NOT EXISTS auth.registration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_name text NOT NULL,
  user_id uuid NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_business_id uuid;
  business_name text;
  user_phone text;
  creation_time timestamptz;
BEGIN
  -- Initialize variables
  creation_time := now();
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'העסק של ' || split_part(NEW.email, '@', 1));
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Log start
  INSERT INTO auth.registration_log (step_name, user_id, details)
  VALUES ('start', NEW.id, jsonb_build_object('email', NEW.email));

  -- 1. Create business first
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings,
    created_at
  )
  VALUES (
    business_name,
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    jsonb_build_object(
      'theme', 'light',
      'notifications', true,
      'language', 'he'
    ),
    creation_time
  )
  RETURNING id INTO new_business_id;

  -- Log business creation
  INSERT INTO auth.registration_log (step_name, user_id, details)
  VALUES ('business_created', NEW.id, jsonb_build_object('business_id', new_business_id));

  -- 2. Create user record with business_id
  INSERT INTO public.users (
    id,
    email,
    phone,
    role,
    business_id,
    created_at,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    user_phone,
    'admin',
    new_business_id,
    creation_time,
    jsonb_build_object(
      'business_id', new_business_id,
      'business_name', business_name,
      'phone', user_phone,
      'role', 'admin',
      'created_at', creation_time
    )
  );

  -- Log user creation
  INSERT INTO auth.registration_log (step_name, user_id, details)
  VALUES ('user_created', NEW.id, jsonb_build_object('business_id', new_business_id));

  -- 3. Create branch
  INSERT INTO public.branches (
    business_id,
    name,
    location,
    created_at
  ) VALUES (
    new_business_id,
    'סניף ראשי',
    jsonb_build_object(
      'address', '',
      'city', '',
      'country', 'IL'
    ),
    creation_time
  );

  -- 4. Create default service
  INSERT INTO public.services (
    business_id,
    name,
    name_he,
    price,
    duration,
    created_at
  ) VALUES (
    new_business_id,
    'Basic Service',
    'שירות בסיסי',
    100,
    interval '30 minutes',
    creation_time
  );

  -- 5. Create business hours
  INSERT INTO public.business_hours (
    business_id,
    regular_hours,
    special_dates,
    created_at
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
    '[]'::jsonb,
    creation_time
  );

  -- Log completion
  INSERT INTO auth.registration_log (step_name, user_id, details)
  VALUES ('completed', NEW.id, jsonb_build_object(
    'business_id', new_business_id,
    'email', NEW.email
  ));

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log error details
  INSERT INTO auth.registration_log (
    step_name,
    user_id,
    details
  ) VALUES (
    'error',
    NEW.id,
    jsonb_build_object(
      'error', SQLERRM,
      'state', SQLSTATE,
      'context', jsonb_build_object(
        'business_name', business_name,
        'email', NEW.email
      )
    )
  );
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();