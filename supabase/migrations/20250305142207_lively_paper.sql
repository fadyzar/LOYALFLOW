/*
  # Add appointment logs policies and fix user_id constraint

  1. Changes
    - Make user_id nullable in appointment_logs table
    - Add RLS policies for appointment_logs table
  
  2. Security
    - Enable RLS on appointment_logs table
    - Add policies for public and authenticated users
*/

-- Make user_id nullable
ALTER TABLE appointment_logs 
  ALTER COLUMN user_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE appointment_logs ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow public to insert logs"
  ON appointment_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to view their appointment logs"
  ON appointment_logs
  FOR SELECT
  TO public
  USING (
    appointment_id IN (
      SELECT id 
      FROM appointments 
      WHERE customer_id IN (
        SELECT id 
        FROM customers 
        WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
      )
    )
  );

CREATE POLICY "Allow staff to view their business logs"
  ON appointment_logs
  FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id 
      FROM appointments 
      WHERE business_id IN (
        SELECT business_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Allow staff to manage their business logs"
  ON appointment_logs
  FOR ALL
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id 
      FROM appointments 
      WHERE business_id IN (
        SELECT business_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    appointment_id IN (
      SELECT id 
      FROM appointments 
      WHERE business_id IN (
        SELECT business_id 
        FROM users 
        WHERE id = auth.uid()
      )
    )
  );