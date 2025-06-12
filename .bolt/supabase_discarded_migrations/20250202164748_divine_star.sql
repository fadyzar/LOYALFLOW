-- Check if step column exists and add it if it doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'registration_log' 
    AND column_name = 'step'
  ) THEN
    ALTER TABLE registration_log 
    ADD COLUMN step integer NOT NULL DEFAULT 1;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_registration_log_user_step 
ON registration_log(user_id, step);

CREATE INDEX IF NOT EXISTS idx_registration_log_status 
ON registration_log(status);