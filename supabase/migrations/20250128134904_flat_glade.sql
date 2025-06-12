/*
  # Add business hours validation functions

  1. New Functions
    - validate_business_hours: Validates business hours configuration
    - update_business_hours_timestamp: Updates updated_at timestamp
*/

-- Create validation function
CREATE OR REPLACE FUNCTION validate_business_hours()
RETURNS trigger AS $$
DECLARE
  day_hours jsonb;
  break_item jsonb;
  breaks jsonb;
  prev_end_time time;
  day_name text;
BEGIN
  -- Validate each day
  FOR day_name IN 
    SELECT * FROM jsonb_object_keys(NEW.regular_hours)
  LOOP
    day_hours := NEW.regular_hours->day_name;
    
    -- Skip if day is not active
    IF NOT (day_hours->>'is_active')::boolean THEN
      CONTINUE;
    END IF;

    -- Validate start time is before end time
    IF (day_hours->>'start_time')::time >= (day_hours->>'end_time')::time THEN
      RAISE EXCEPTION 'שעת התחלה חייבת להיות לפני שעת הסיום ביום %', day_name;
    END IF;

    -- Validate breaks
    breaks := day_hours->'breaks';
    prev_end_time := NULL;
    
    FOR break_item IN 
      SELECT * FROM jsonb_array_elements(breaks)
    LOOP
      -- Validate break times
      IF (break_item->>'start_time')::time >= (break_item->>'end_time')::time THEN
        RAISE EXCEPTION 'שעת התחלה של הפסקה חייבת להיות לפני שעת הסיום ביום %', day_name;
      END IF;

      -- Validate break is within working hours
      IF (break_item->>'start_time')::time < (day_hours->>'start_time')::time OR
         (break_item->>'end_time')::time > (day_hours->>'end_time')::time THEN
        RAISE EXCEPTION 'הפסקה חייבת להיות בתוך שעות העבודה ביום %', day_name;
      END IF;

      -- Validate no overlap with previous break
      IF prev_end_time IS NOT NULL AND
         (break_item->>'start_time')::time <= prev_end_time THEN
        RAISE EXCEPTION 'הפסקות לא יכולות לחפוף ביום %', day_name;
      END IF;

      prev_end_time := (break_item->>'end_time')::time;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_business_hours_trigger
  BEFORE INSERT OR UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION validate_business_hours();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_business_hours_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
CREATE TRIGGER update_business_hours_timestamp_trigger
  BEFORE UPDATE ON business_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_business_hours_timestamp();