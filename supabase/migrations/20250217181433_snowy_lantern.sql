-- Add duration column to staff_services table
ALTER TABLE staff_services
ADD COLUMN IF NOT EXISTS duration interval;

-- Create index for duration
CREATE INDEX IF NOT EXISTS idx_staff_services_duration ON staff_services(duration);

-- Update existing records with default duration from services
UPDATE staff_services ss
SET duration = s.duration
FROM services s
WHERE ss.service_id = s.id AND ss.duration IS NULL;