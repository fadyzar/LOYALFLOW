-- Drop existing triggers and functions first
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create base tables
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  booking_link text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{"theme": "light", "notifications": true}'::jsonb,
  stats jsonb DEFAULT '{
    "revenue": {"daily": 0, "weekly": 0, "monthly": 0, "yearly": 0},
    "appointments": {"daily": 0, "weekly": 0, "monthly": 0, "yearly": 0},
    "customers": {"total": 0, "new": {"daily": 0, "weekly": 0, "monthly": 0}, "returning": 0}
  }'::jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  business_id uuid REFERENCES businesses(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  CONSTRAINT users_business_email_unique UNIQUE (business_id, email)
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  name text NOT NULL,
  location jsonb DEFAULT '{"address": "", "city": "", "country": "IL"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT branches_business_name_unique UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  business_id uuid REFERENCES businesses(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  CONSTRAINT customers_business_phone_unique UNIQUE (business_id, phone)
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  name text NOT NULL,
  name_he text NOT NULL,
  price decimal(10,2) NOT NULL,
  duration interval NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT services_business_name_unique UNIQUE (business_id, name)
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  service_id uuid REFERENCES services(id) NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('booked', 'confirmed', 'completed', 'canceled')),
  customer_notes text,
  staff_notes text,
  reminder_sent boolean DEFAULT false,
  confirmation_sent boolean DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_business_role ON users(business_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_businesses_booking_link ON businesses(booking_link);
CREATE INDEX IF NOT EXISTS idx_appointments_business_date ON appointments(business_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_business_id uuid;
  business_name text;
BEGIN
  -- Set business name from raw_user_meta_data
  business_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    'העסק של ' || split_part(NEW.email, '@', 1)
  );

  -- Create new business
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings,
    stats,
    achievements
  )
  VALUES (
    business_name,
    split_part(NEW.email, '@', 1) || '-' || substr(md5(random()::text), 1, 6),
    '{"theme": "light", "notifications": true}'::jsonb,
    '{
      "revenue": {"daily": 0, "weekly": 0, "monthly": 0, "yearly": 0},
      "appointments": {"daily": 0, "weekly": 0, "monthly": 0, "yearly": 0},
      "customers": {"total": 0, "new": {"daily": 0, "weekly": 0, "monthly": 0}, "returning": 0}
    }'::jsonb,
    '[]'::jsonb
  )
  RETURNING id INTO new_business_id;

  -- Create user record
  INSERT INTO public.users (
    id,
    email,
    phone,
    role,
    business_id,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'admin',
    new_business_id,
    jsonb_build_object(
      'business_name', business_name,
      'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
  );

  -- Create default branch
  INSERT INTO public.branches (
    business_id,
    name,
    location
  ) VALUES (
    new_business_id,
    'סניף ראשי',
    '{"address": "", "city": "", "country": "IL"}'::jsonb
  );

  -- Create default service
  INSERT INTO public.services (
    business_id,
    name,
    name_he,
    price,
    duration
  ) VALUES (
    new_business_id,
    'Basic Service',
    'שירות בסיסי',
    100,
    interval '30 minutes'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Drop existing policies
DROP POLICY IF EXISTS "allow_business_select" ON public.businesses;
DROP POLICY IF EXISTS "allow_business_update" ON public.businesses;
DROP POLICY IF EXISTS "allow_user_select" ON public.users;
DROP POLICY IF EXISTS "allow_user_update" ON public.users;
DROP POLICY IF EXISTS "allow_branch_select" ON public.branches;
DROP POLICY IF EXISTS "allow_branch_insert" ON public.branches;
DROP POLICY IF EXISTS "allow_branch_update" ON public.branches;
DROP POLICY IF EXISTS "allow_service_select" ON public.services;
DROP POLICY IF EXISTS "allow_service_insert" ON public.services;
DROP POLICY IF EXISTS "allow_service_update" ON public.services;

-- Create RLS policies
CREATE POLICY "allow_business_select"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_business_update"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "allow_user_select"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_user_update"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "allow_branch_select"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_branch_insert"
  ON public.branches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_branch_update"
  ON public.branches
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "allow_service_select"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_service_insert"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_service_update"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;