-- Create registration_steps table
CREATE TABLE IF NOT EXISTS registration_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  business_id uuid REFERENCES businesses(id),
  type text NOT NULL CHECK (type IN ('business', 'staff')),
  current_step integer NOT NULL DEFAULT 1,
  steps_data jsonb DEFAULT '{}'::jsonb,
  completed_steps integer[] DEFAULT '{}'::integer[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id)
);

-- Create function to validate step completion
CREATE OR REPLACE FUNCTION validate_step_completion(
  p_user_id uuid,
  p_step integer
) RETURNS boolean AS $$
DECLARE
  v_registration registration_steps;
  v_step_data jsonb;
BEGIN
  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get step data
  v_step_data := v_registration.steps_data->p_step::text;

  -- Validate based on registration type and step
  CASE
    WHEN v_registration.type = 'business' THEN
      CASE p_step
        WHEN 1 THEN -- Basic registration
          RETURN (v_step_data->>'email' IS NOT NULL AND v_step_data->>'password' IS NOT NULL);
        WHEN 2 THEN -- Business details
          RETURN (v_step_data->>'name' IS NOT NULL AND v_step_data->>'phone' IS NOT NULL);
        WHEN 3 THEN -- Business hours
          RETURN (v_step_data->>'hours' IS NOT NULL);
        WHEN 4 THEN -- Services
          RETURN (v_step_data->>'services' IS NOT NULL AND jsonb_array_length(v_step_data->'services') > 0);
        ELSE
          RETURN false;
      END CASE;
    WHEN v_registration.type = 'staff' THEN
      CASE p_step
        WHEN 1 THEN -- Basic registration
          RETURN (v_step_data->>'email' IS NOT NULL AND v_step_data->>'password' IS NOT NULL);
        WHEN 2 THEN -- Staff details
          RETURN (v_step_data->>'name' IS NOT NULL AND v_step_data->>'phone' IS NOT NULL);
        ELSE
          RETURN false;
      END CASE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update step
CREATE OR REPLACE FUNCTION update_registration_step(
  p_user_id uuid,
  p_step integer,
  p_data jsonb
) RETURNS registration_steps AS $$
DECLARE
  v_registration registration_steps;
BEGIN
  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Validate current step
  IF p_step != v_registration.current_step THEN
    RAISE EXCEPTION 'Invalid step';
  END IF;

  -- Update step data
  UPDATE registration_steps
  SET
    steps_data = jsonb_set(steps_data, ARRAY[p_step::text], p_data),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_registration;

  -- If step is valid, mark as completed and move to next step
  IF validate_step_completion(p_user_id, p_step) THEN
    UPDATE registration_steps
    SET
      completed_steps = array_append(completed_steps, p_step),
      current_step = 
        CASE 
          WHEN type = 'business' AND p_step = 4 THEN p_step  -- Last step for business
          WHEN type = 'staff' AND p_step = 2 THEN p_step     -- Last step for staff
          ELSE p_step + 1
        END,
      completed_at = 
        CASE 
          WHEN (type = 'business' AND p_step = 4) OR (type = 'staff' AND p_step = 2)
          THEN now()
          ELSE null
        END
    WHERE user_id = p_user_id
    RETURNING * INTO v_registration;
  END IF;

  RETURN v_registration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify handle_new_user function to support the new flow
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create basic user record
  INSERT INTO public.users (
    id,
    email,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  );

  -- Create registration record
  INSERT INTO registration_steps (
    user_id,
    type,
    steps_data
  ) VALUES (
    NEW.id,
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'admin') = 'admin' THEN 'business'
      ELSE 'staff'
    END,
    jsonb_build_object(
      '1', jsonb_build_object(
        'email', NEW.email,
        'password', '********'  -- Password is handled by auth
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE registration_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own registration"
  ON registration_steps
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own registration"
  ON registration_steps
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON registration_steps TO authenticated;
GRANT EXECUTE ON FUNCTION validate_step_completion TO authenticated;
GRANT EXECUTE ON FUNCTION update_registration_step TO authenticated;