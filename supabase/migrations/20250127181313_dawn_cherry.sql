-- Drop existing policies
DROP POLICY IF EXISTS "enable_business_access" ON public.businesses;
DROP POLICY IF EXISTS "enable_user_access" ON public.users;
DROP POLICY IF EXISTS "enable_all_access" ON public.branches;
DROP POLICY IF EXISTS "enable_all_access" ON public.services;

-- Create simple policies without recursion
CREATE POLICY "allow_all"
  ON public.businesses
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_all"
  ON public.services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.businesses TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.branches TO authenticated;
GRANT ALL ON public.services TO authenticated;