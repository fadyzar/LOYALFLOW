/*
  # Fix user metadata and business associations

  1. Changes
    - Add function to sync user metadata with business data
    - Fix existing user metadata
    - Add trigger to keep metadata in sync

  2. Metadata Structure
    - business_id: UUID of user's business
    - business_name: Name of the business
    - role: User's role (admin/staff)
*/

-- Create function to sync user metadata
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS trigger AS $$
BEGIN
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'business_id', NEW.business_id,
    'business_name', (SELECT name FROM businesses WHERE id = NEW.business_id),
    'phone', COALESCE(NEW.phone, ''),
    'role', NEW.role,
    'created_at', NEW.created_at,
    'settings', COALESCE(
      NEW.metadata->'settings',
      jsonb_build_object(
        'theme', 'light',
        'notifications', true,
        'language', 'he'
      )
    )
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep metadata in sync
CREATE TRIGGER sync_user_metadata_trigger
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();

-- Fix existing users metadata
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      u.id,
      u.email,
      u.business_id,
      u.phone,
      u.role,
      u.created_at,
      u.metadata,
      b.name as business_name
    FROM public.users u
    JOIN public.businesses b ON u.business_id = b.id
  LOOP
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
      'business_id', user_record.business_id,
      'business_name', user_record.business_name,
      'phone', COALESCE(user_record.phone, ''),
      'role', user_record.role,
      'created_at', user_record.created_at,
      'settings', COALESCE(
        user_record.metadata->'settings',
        jsonb_build_object(
          'theme', 'light',
          'notifications', true,
          'language', 'he'
        )
      )
    )
    WHERE id = user_record.id;

    -- Update public.users metadata
    UPDATE public.users
    SET metadata = jsonb_build_object(
      'business_id', user_record.business_id,
      'business_name', user_record.business_name,
      'phone', COALESCE(user_record.phone, ''),
      'role', user_record.role,
      'created_at', user_record.created_at,
      'settings', COALESCE(
        user_record.metadata->'settings',
        jsonb_build_object(
          'theme', 'light',
          'notifications', true,
          'language', 'he'
        )
      )
    )
    WHERE id = user_record.id;
  END LOOP;
END $$;