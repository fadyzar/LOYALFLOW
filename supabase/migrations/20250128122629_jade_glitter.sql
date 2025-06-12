/*
  # Add Business Breaks and Special Dates

  1. New Tables
    - `business_breaks`
      - `id` (uuid, primary key)
      - `business_id` (uuid, references businesses)
      - `day_of_week` (smallint)
      - `start_time` (time)
      - `end_time` (time)
      
    - `business_special_dates`
      - `id` (uuid, primary key)
      - `business_id` (uuid, references businesses)
      - `date` (date)
      - `is_closed` (boolean)
      - `start_time` (time, nullable)
      - `end_time` (time, nullable)
      - `note` (text, nullable)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create business_breaks table
CREATE TABLE IF NOT EXISTS business_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create business_special_dates table
CREATE TABLE IF NOT EXISTS business_special_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  date date NOT NULL,
  is_closed boolean DEFAULT false,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(business_id, date)
);

-- Enable RLS
ALTER TABLE business_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_special_dates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "enable_all_access"
  ON business_breaks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "enable_all_access"
  ON business_special_dates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON business_breaks TO authenticated;
GRANT ALL ON business_special_dates TO authenticated;

-- Create indexes
CREATE INDEX idx_business_breaks_business ON business_breaks(business_id);
CREATE INDEX idx_business_special_dates_business ON business_special_dates(business_id);
CREATE INDEX idx_business_special_dates_date ON business_special_dates(date);