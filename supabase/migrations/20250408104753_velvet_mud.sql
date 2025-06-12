-- Step 1: Drop existing foreign key constraint
ALTER TABLE appointment_logs 
DROP CONSTRAINT IF EXISTS appointment_logs_appointment_id_fkey;

-- Step 2: Add new constraint with ON DELETE CASCADE
ALTER TABLE appointment_logs
ADD CONSTRAINT appointment_logs_appointment_id_fkey
FOREIGN KEY (appointment_id)
REFERENCES appointments(id)
ON DELETE CASCADE;