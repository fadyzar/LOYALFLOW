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

-- Create registration_log table for debugging
CREATE TABLE IF NOT EXISTS registration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  step integer NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE registration_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_log ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can view their own logs"
  ON registration_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON registration_steps TO authenticated;
GRANT ALL ON registration_log TO authenticated;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_registration_step_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
CREATE TRIGGER update_registration_step_timestamp
  BEFORE UPDATE ON registration_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_step_timestamp();