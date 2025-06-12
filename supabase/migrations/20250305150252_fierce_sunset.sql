/*
  # Update appointment logs policies

  1. Security
    - Enable RLS on appointment_logs table
    - Add policies for public and authenticated users
    - Fix uid() function to use auth.uid()

  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with correct auth.uid() function
    - Allow public users to insert and view their logs
    - Allow staff to manage and view their business logs
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to insert logs" ON appointment_logs;
DROP POLICY IF EXISTS "Allow public to view their appointment logs" ON appointment_logs;
DROP POLICY IF EXISTS "Allow staff to manage their business logs" ON appointment_logs;
DROP POLICY IF EXISTS "Allow staff to view their business logs" ON appointment_logs;

-- Enable RLS
ALTER TABLE appointment_logs ENABLE ROW LEVEL SECURITY;

-- Allow public to insert logs
CREATE POLICY "Allow public to insert logs"
ON appointment_logs
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to view their appointment logs
CREATE POLICY "Allow public to view their appointment logs"
ON appointment_logs
FOR SELECT
TO public
USING (
  appointment_id IN (
    SELECT appointments.id 
    FROM appointments
    WHERE appointments.customer_id IN (
      SELECT customers.id
      FROM customers
      WHERE customers.phone = current_setting('request.jwt.claims')::json->>'phone'
    )
  )
);

-- Allow staff to manage their business logs
CREATE POLICY "Allow staff to manage their business logs"
ON appointment_logs
FOR ALL
TO authenticated
USING (
  appointment_id IN (
    SELECT appointments.id
    FROM appointments
    WHERE appointments.business_id IN (
      SELECT users.business_id
      FROM users
      WHERE users.id = auth.uid()
    )
  )
)
WITH CHECK (
  appointment_id IN (
    SELECT appointments.id
    FROM appointments
    WHERE appointments.business_id IN (
      SELECT users.business_id
      FROM users
      WHERE users.id = auth.uid()
    )
  )
);

-- Allow staff to view their business logs
CREATE POLICY "Allow staff to view their business logs"
ON appointment_logs
FOR SELECT
TO authenticated
USING (
  appointment_id IN (
    SELECT appointments.id
    FROM appointments
    WHERE appointments.business_id IN (
      SELECT users.business_id
      FROM users
      WHERE users.id = auth.uid()
    )
  )
);