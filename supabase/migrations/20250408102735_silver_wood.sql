-- Drop existing foreign key constraint
ALTER TABLE appointment_logs 
DROP CONSTRAINT IF EXISTS appointment_logs_appointment_id_fkey;

-- Add new constraint with ON DELETE CASCADE
ALTER TABLE appointment_logs
ADD CONSTRAINT appointment_logs_appointment_id_fkey
FOREIGN KEY (appointment_id)
REFERENCES appointments(id)
ON DELETE CASCADE;

-- Instead of using COMMENT, we'll create a simple table to track migrations if needed
DO $$
BEGIN
    -- This is a simple DO block that doesn't actually do anything
    -- but allows us to avoid the COMMENT statement that might be causing issues
    RAISE NOTICE 'Migration completed: Added ON DELETE CASCADE to appointment_logs_appointment_id_fkey';
END $$;