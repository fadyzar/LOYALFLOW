-- Drop existing business policies
DROP POLICY IF EXISTS "allow_business_select" ON public.businesses;
DROP POLICY IF EXISTS "allow_business_update" ON public.businesses;

-- Create new business policies
CREATE POLICY "allow_business_select"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT business_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "allow_business_update"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT business_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT business_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );