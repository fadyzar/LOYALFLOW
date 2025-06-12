-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create improved function to handle new user registration
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
    jsonb_build_object(
      'theme', 'light',
      'notifications', true
    )
  )
  RETURNING id INTO new_business_id;

  -- Create user record with metadata
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

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'business_name', business_name,
    'phone', user_phone,
    'business_id', new_business_id
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
    new_business_id,
    'Basic Service',
    'שירות בסיסי',
    100,
    interval '30 minutes'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Drop existing policies
DROP POLICY IF EXISTS "enable_all_access" ON public.businesses;
DROP POLICY IF EXISTS "enable_all_access" ON public.users;
DROP POLICY IF EXISTS "enable_all_access" ON public.branches;
DROP POLICY IF EXISTS "enable_all_access" ON public.services;

-- Create improved policies for businesses
CREATE POLICY "allow_select_own_business"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "allow_update_own_business"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

-- Create improved policies for users
CREATE POLICY "allow_select_own_user"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR
    business_id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "allow_update_own_user"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Create improved policies for branches
CREATE POLICY "allow_access_own_branches"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

-- Create improved policies for services
CREATE POLICY "allow_access_own_services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id 
      FROM public.users 
      WHERE users.id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.branches TO authenticated;
GRANT ALL ON public.services TO authenticated;