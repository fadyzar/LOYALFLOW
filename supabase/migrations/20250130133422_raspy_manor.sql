/*
  # Staff Management System

  1. New Tables
    - `staff_services`: Links staff members to services with custom pricing
    - `staff_hours`: Custom working hours and special dates for staff
    - `staff_specialties`: Staff specialties/tags

  2. Schema Updates
    - Add new columns to `users` table for staff profiles
    - Add indexes for performance
    - Add foreign key constraints

  3. Security
    - Enable RLS
    - Add policies for access control
*/

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS specialties jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT jsonb_build_object(
  'rest_time', 15,
  'max_daily_appointments', null,
  'visible_in_public', true
);

-- Create staff_services table
CREATE TABLE IF NOT EXISTS staff_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  price decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, service_id)
);

-- Create staff_hours table
CREATE TABLE IF NOT EXISTS staff_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE,
  regular_hours jsonb,
  special_dates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id)
);

-- Create staff_specialties table
CREATE TABLE IF NOT EXISTS staff_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_he text NOT NULL,
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Enable RLS
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_specialties ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_services_staff ON staff_services(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_service ON staff_services(service_id);
CREATE INDEX IF NOT EXISTS idx_staff_hours_staff ON staff_hours(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_specialties_business ON staff_specialties(business_id);

-- Create timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_staff_services_updated_at
  BEFORE UPDATE ON staff_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_hours_updated_at
  BEFORE UPDATE ON staff_hours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create policies
CREATE POLICY "Enable all access for authenticated users"
  ON staff_services
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users"
  ON staff_hours
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users"
  ON staff_specialties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON staff_services TO authenticated;
GRANT ALL ON staff_hours TO authenticated;
GRANT ALL ON staff_specialties TO authenticated;