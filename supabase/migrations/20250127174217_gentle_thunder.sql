-- Drop existing business policies
DROP POLICY IF EXISTS "allow_business_select" ON public.businesses;
DROP POLICY IF EXISTS "allow_business_update" ON public.businesses;

-- Create simple policies for businesses
CREATE POLICY "enable_all_access"
  ON public.businesses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update user policies to be more permissive
DROP POLICY IF EXISTS "allow_user_select" ON public.users;
DROP POLICY IF EXISTS "allow_user_update" ON public.users;

CREATE POLICY "enable_all_access"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update branch policies
DROP POLICY IF EXISTS "allow_branch_select" ON public.branches;
DROP POLICY IF EXISTS "allow_branch_insert" ON public.branches;
DROP POLICY IF EXISTS "allow_branch_update" ON public.branches;

CREATE POLICY "enable_all_access"
  ON public.branches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update service policies
DROP POLICY IF EXISTS "allow_service_select" ON public.services;
DROP POLICY IF EXISTS "allow_service_insert" ON public.services;
DROP POLICY IF EXISTS "allow_service_update" ON public.services;

CREATE POLICY "enable_all_access"
  ON public.services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant full permissions to authenticated users
GRANT ALL ON public.businesses TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.branches TO authenticated;
GRANT ALL ON public.services TO authenticated;