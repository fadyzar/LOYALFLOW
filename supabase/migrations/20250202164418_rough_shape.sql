-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create simplified function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from metadata or default to 'admin'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');

  -- Log the role we're trying to use
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    NEW.id,
    1,
    'create_user',
    'started',
    jsonb_build_object(
      'email', NEW.email,
      'role', user_role,
      'metadata', NEW.raw_user_meta_data
    )
  );

  -- Create user record with explicit role
  INSERT INTO public.users (
    id,
    email,
    role,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    user_role,  -- Use the role we got from metadata
    jsonb_build_object(
      'email', NEW.email,
      'role', user_role,
      'created_at', now()
    )
  );

  -- Create registration record
  INSERT INTO registration_steps (
    user_id,
    type,
    current_step,
    steps_data
  ) VALUES (
    NEW.id,
    'business',
    1,
    jsonb_build_object(
      '1', jsonb_build_object(
        'email', NEW.email
      )
    )
  );

  -- Log successful creation
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    NEW.id,
    1,
    'create_user',
    'completed',
    jsonb_build_object(
      'email', NEW.email,
      'role', user_role
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();