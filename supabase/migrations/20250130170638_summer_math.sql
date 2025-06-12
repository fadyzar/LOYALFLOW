-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  business_id uuid;
  user_role text;
  user_phone text;
BEGIN
  -- Get data from raw_user_meta_data
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  business_id := (NEW.raw_user_meta_data->>'business_id')::uuid;

  -- Validate role
  IF user_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', user_role;
  END IF;

  -- For staff members, business_id is required
  IF user_role = 'staff' AND business_id IS NULL THEN
    RAISE EXCEPTION 'Business ID is required for staff members';
  END IF;

  -- For admin users, create new business if needed
  IF user_role = 'admin' AND business_id IS NULL THEN
    INSERT INTO public.businesses (
      name,
      booking_link,
      settings
    )
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'business_name', 'העסק של ' || split_part(NEW.email, '@', 1)),
      lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
      jsonb_build_object(
        'theme', 'light',
        'notifications', true,
        'language', 'he'
      )
    )
    RETURNING id INTO business_id;

    -- Create default branch
    INSERT INTO public.branches (
      business_id,
      name,
      location
    ) VALUES (
      business_id,
      'סניף ראשי',
      jsonb_build_object(
        'address', '',
        'city', '',
        'country', 'IL'
      )
    );

    -- Create default service
    INSERT INTO public.services (
      business_id,
      name,
      name_he,
      price,
      duration
    ) VALUES (
      business_id,
      'Basic Service',
      'שירות בסיסי',
      100,
      interval '30 minutes'
    );

    -- Create default business hours
    INSERT INTO public.business_hours (
      business_id,
      regular_hours,
      special_dates
    ) VALUES (
      business_id,
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
  END IF;

  -- Create user record
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
    user_role,
    business_id,
    jsonb_build_object(
      'business_id', business_id,
      'phone', user_phone,
      'role', user_role,
      'created_at', now()
    )
  );

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'business_id', business_id,
    'phone', user_phone,
    'role', user_role,
    'created_at', now()
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();