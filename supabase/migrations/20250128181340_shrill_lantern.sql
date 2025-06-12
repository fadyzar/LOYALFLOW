-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create registration_log table for debugging
CREATE TABLE IF NOT EXISTS auth.registration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid,
  step_name text,
  details jsonb
);

-- Create simplified function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log start
  INSERT INTO auth.registration_log (user_id, step_name, details)
  VALUES (NEW.id, 'start', jsonb_build_object('email', NEW.email));

  BEGIN
    -- Create basic user record only
    INSERT INTO public.users (
      id,
      email,
      role
    ) VALUES (
      NEW.id,
      NEW.email,
      'admin'
    );

    -- Log success
    INSERT INTO auth.registration_log (user_id, step_name, details)
    VALUES (NEW.id, 'success', jsonb_build_object('user_id', NEW.id));

  EXCEPTION WHEN OTHERS THEN
    -- Log error
    INSERT INTO auth.registration_log (user_id, step_name, details)
    VALUES (
      NEW.id,
      'error',
      jsonb_build_object(
        'error', SQLERRM,
        'state', SQLSTATE
      )
    );
    RAISE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Grant permissions
GRANT ALL ON auth.registration_log TO postgres, authenticated, service_role;