/*
  # Fix appointments RLS policies

  1. Changes
    - Add policy for customers to cancel their own appointments
    - Add policy for customers to view their own appointments
    - Add policy for customers to update their own appointments

  2. Security
    - Enable RLS on appointments table
    - Add specific policies for customer access
*/

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow customers to view their own appointments
CREATE POLICY "Customers can view their appointments"
ON appointments FOR SELECT
TO public
USING (
  customer_id IN (
    SELECT id 
    FROM customers 
    WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
  )
);

-- Allow customers to update their own appointments
CREATE POLICY "Customers can update their appointments"
ON appointments FOR UPDATE
TO public
USING (
  customer_id IN (
    SELECT id 
    FROM customers 
    WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
  )
)
WITH CHECK (
  customer_id IN (
    SELECT id 
    FROM customers 
    WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
  )
);

-- Allow customers to cancel their own appointments
CREATE POLICY "Customers can cancel their appointments"
ON appointments FOR UPDATE
TO public
USING (
  customer_id IN (
    SELECT id 
    FROM customers 
    WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
  )
)
WITH CHECK (
  status = 'canceled' AND
  customer_id IN (
    SELECT id 
    FROM customers 
    WHERE phone = current_setting('request.jwt.claims')::json->>'phone'
  )
);