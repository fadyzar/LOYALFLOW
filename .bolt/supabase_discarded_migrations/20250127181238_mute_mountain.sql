-- Drop existing policies
DROP POLICY IF EXISTS "enable_business_access" ON public.businesses;
DROP POLICY IF EXISTS "enable_user_access" ON public.users;

-- Create non-recursive policies for businesses
CREATE POLICY "businesses_select_policy"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "businesses_update_policy"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create non-recursive policies for users
CREATE POLICY "users_select_policy"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;