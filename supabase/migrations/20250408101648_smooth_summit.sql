/*
  # Fix appointment_logs foreign key constraint

  1. Changes
    - Update the foreign key constraint on appointment_logs table
    - Add ON DELETE CASCADE to automatically delete logs when appointments are deleted
  
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity by properly handling related records
*/

-- Drop existing foreign key constraint
ALTER TABLE appointment_logs 
DROP CONSTRAINT IF EXISTS appointment_logs_appointment_id_fkey;

-- Add new constraint with ON DELETE CASCADE
ALTER TABLE appointment_logs
ADD CONSTRAINT appointment_logs_appointment_id_fkey
FOREIGN KEY (appointment_id)
REFERENCES appointments(id)
ON DELETE CASCADE;

-- Log the change (using a comment instead of inserting into a table)
COMMENT ON CONSTRAINT appointment_logs_appointment_id_fkey ON appointment_logs IS 
'Updated on 2025-04-08 to add ON DELETE CASCADE behavior';