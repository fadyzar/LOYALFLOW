/*
  # Add Business Hours and Staff Management

  1. New Tables
    - `business_hours`
      - `id` (uuid, primary key)
      - `business_id` (uuid, references businesses)
      - `day_of_week` (smallint)
      - `start_time` (time)
      - `end_time` (time)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create business_hours table
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, day_of_week)
);

-- Enable RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "enable_all_access"
  ON business_hours
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON business_hours TO authenticated;

-- Create indexes
CREATE INDEX idx_business_hours_business ON business_hours(business_id);