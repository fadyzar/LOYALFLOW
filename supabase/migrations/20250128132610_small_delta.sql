/*
  # Update business hours schema

  1. Changes
    - Replace individual rows per day with a single row per business
    - Add JSON columns for regular hours and breaks
    - Simplify special dates structure

  2. Data Migration
    - Convert existing data to new format
    - Preserve all current settings
*/

-- Create new business_hours_new table
CREATE TABLE IF NOT EXISTS business_hours_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL UNIQUE,
  regular_hours jsonb NOT NULL DEFAULT jsonb_build_object(
    'sunday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'monday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'tuesday',   jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'wednesday', jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'thursday',  jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'friday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
    'saturday',  jsonb_build_object('is_active', false, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb)
  ),
  special_dates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE business_hours_new ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "enable_all_access"
  ON business_hours_new
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON business_hours_new TO authenticated;

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_business_hours_business'
  ) THEN
    CREATE INDEX idx_business_hours_business ON business_hours_new(business_id);
  END IF;
END $$;

-- Migrate data from old tables
DO $$
DECLARE
  business_record RECORD;
  old_hours RECORD;
  old_breaks RECORD;
  old_special_dates RECORD;
  regular_hours jsonb;
  day_names text[] := ARRAY['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  breaks jsonb;
  special_dates jsonb := '[]'::jsonb;
BEGIN
  FOR business_record IN SELECT id FROM businesses LOOP
    -- Initialize regular hours with defaults
    regular_hours := jsonb_build_object(
      'sunday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'monday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'tuesday',   jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'wednesday', jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'thursday',  jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'friday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'saturday',  jsonb_build_object('is_active', false, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb)
    );

    -- Update regular hours from old table
    FOR old_hours IN 
      SELECT * FROM business_hours 
      WHERE business_id = business_record.id
    LOOP
      regular_hours := jsonb_set(
        regular_hours,
        ARRAY[day_names[old_hours.day_of_week + 1]],
        jsonb_build_object(
          'is_active', old_hours.is_active,
          'start_time', old_hours.start_time,
          'end_time', old_hours.end_time,
          'breaks', '[]'::jsonb
        )
      );
    END LOOP;

    -- Add breaks to regular hours
    FOR old_breaks IN 
      SELECT * FROM business_breaks 
      WHERE business_id = business_record.id
    LOOP
      breaks := (regular_hours #>> ARRAY[day_names[old_breaks.day_of_week + 1], 'breaks'])::jsonb;
      breaks := breaks || jsonb_build_object(
        'start_time', old_breaks.start_time,
        'end_time', old_breaks.end_time
      );
      regular_hours := jsonb_set(
        regular_hours,
        ARRAY[day_names[old_breaks.day_of_week + 1], 'breaks'],
        breaks
      );
    END LOOP;

    -- Migrate special dates
    FOR old_special_dates IN 
      SELECT * FROM business_special_dates 
      WHERE business_id = business_record.id
    LOOP
      special_dates := special_dates || jsonb_build_object(
        'date', old_special_dates.date,
        'is_closed', old_special_dates.is_closed,
        'start_time', old_special_dates.start_time,
        'end_time', old_special_dates.end_time,
        'note', old_special_dates.note
      );
    END LOOP;

    -- Insert into new table
    INSERT INTO business_hours_new (
      business_id,
      regular_hours,
      special_dates
    ) VALUES (
      business_record.id,
      regular_hours,
      special_dates
    );
  END LOOP;
END $$;

-- Drop old tables
DROP TABLE IF EXISTS business_breaks;
DROP TABLE IF EXISTS business_special_dates;
DROP TABLE IF EXISTS business_hours;

-- Rename new table
ALTER TABLE business_hours_new RENAME TO business_hours;