-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create function to handle new user registration
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

  -- Create new business
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings
  )
  VALUES (
    business_name,
    split_part(NEW.email, '@', 1) || '-' || substr(md5(random()::text), 1, 6),
    '{"theme": "light", "notifications": true}'::jsonb
  )
  RETURNING id INTO new_business_id;

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
    'admin',
    new_business_id,
    jsonb_build_object(
      'business_name', business_name,
      'phone', user_phone
    )
  );

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

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'business_name', business_name,
    'phone', user_phone,
    'business_id', new_business_id
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Update RLS policies
DROP POLICY IF EXISTS "enable_all_access" ON public.businesses;
DROP POLICY IF EXISTS "enable_all_access" ON public.users;

-- Create simplified policies
CREATE POLICY "enable_business_access"
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "enable_user_access"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    id = auth.uid() OR
    business_id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );