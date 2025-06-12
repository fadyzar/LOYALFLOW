-- Drop existing status check constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add updated status check constraint
ALTER TABLE appointments
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('booked', 'confirmed', 'completed', 'canceled', 'no_show'));

-- Update any existing appointments with invalid status
UPDATE appointments 
SET status = 'booked'
WHERE status NOT IN ('booked', 'confirmed', 'completed', 'canceled', 'no_show');