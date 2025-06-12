-- Create invoice_sequences table to manage sequential numbering
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  year integer NOT NULL,
  last_number integer DEFAULT 0,
  prefix text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, year)
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  number text NOT NULL,
  type text NOT NULL CHECK (type IN ('invoice', 'receipt', 'credit_note', 'proforma')),
  status text NOT NULL CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'refunded')),
  subtotal decimal(10,2) NOT NULL DEFAULT 0,
  tax_rate decimal(5,2) NOT NULL DEFAULT 17.00,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL DEFAULT 0,
  notes text,
  payment_method text CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'check', 'other')),
  payment_reference text,
  due_date timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  original_invoice_id uuid REFERENCES invoices(id), -- For credit notes
  pdf_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, number)
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id),
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2),
  tax_rate decimal(5,2) NOT NULL DEFAULT 17.00,
  tax_amount decimal(10,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create invoice_payments table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'check', 'other')),
  payment_date timestamptz NOT NULL,
  reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create invoice_logs table for audit trail
CREATE TABLE IF NOT EXISTS invoice_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL,
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_invoice_sequences_business ON invoice_sequences(business_id);
CREATE INDEX idx_invoices_business ON invoices(business_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_number ON invoices(number);
CREATE INDEX idx_invoices_type ON invoices(type);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_logs_invoice ON invoice_logs(invoice_id);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_invoice_sequences_timestamp
  BEFORE UPDATE ON invoice_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

CREATE TRIGGER update_invoices_timestamp
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_timestamp();

-- Create function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_business_id uuid,
  p_type text DEFAULT 'invoice'
) RETURNS text AS $$
DECLARE
  v_year integer;
  v_sequence invoice_sequences%ROWTYPE;
  v_next_number integer;
  v_prefix text;
  v_number text;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get or create sequence for this business and year
  SELECT * INTO v_sequence
  FROM invoice_sequences
  WHERE business_id = p_business_id AND year = v_year
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO invoice_sequences (business_id, year, last_number)
    VALUES (p_business_id, v_year, 0)
    RETURNING * INTO v_sequence;
  END IF;
  
  -- Generate next number
  v_next_number := v_sequence.last_number + 1;
  
  -- Update sequence
  UPDATE invoice_sequences
  SET last_number = v_next_number
  WHERE id = v_sequence.id;
  
  -- Generate prefix based on type
  v_prefix := CASE p_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'receipt' THEN 'REC'
    WHEN 'credit_note' THEN 'CN'
    WHEN 'proforma' THEN 'PRO'
    ELSE 'DOC'
  END;
  
  -- Format number
  v_number := v_prefix || '-' || v_year || '-' || LPAD(v_next_number::text, 6, '0');
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(p_invoice_id uuid)
RETURNS void AS $$
DECLARE
  v_subtotal decimal(10,2);
  v_tax_amount decimal(10,2);
  v_total decimal(10,2);
BEGIN
  -- Calculate totals from items
  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(tax_amount), 0)
  INTO v_subtotal, v_tax_amount
  FROM invoice_items
  WHERE invoice_id = p_invoice_id;
  
  v_total := v_subtotal + v_tax_amount;
  
  -- Update invoice
  UPDATE invoices
  SET 
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total = v_total,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate invoice before finalizing
CREATE OR REPLACE FUNCTION validate_invoice(p_invoice_id uuid)
RETURNS boolean AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_items_count integer;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  -- Check if invoice is already finalized
  IF v_invoice.status != 'draft' THEN
    RAISE EXCEPTION 'Invoice is already finalized';
  END IF;
  
  -- Check if invoice has items
  SELECT COUNT(*) INTO v_items_count
  FROM invoice_items
  WHERE invoice_id = p_invoice_id;
  
  IF v_items_count = 0 THEN
    RAISE EXCEPTION 'Invoice must have at least one item';
  END IF;
  
  -- Validate totals
  PERFORM calculate_invoice_totals(p_invoice_id);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create policies
CREATE POLICY "Users can view their business invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business invoice sequences"
  ON invoice_sequences
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business invoice sequences"
  ON invoice_sequences
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business invoice items"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their business invoice items"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their business invoice payments"
  ON invoice_payments
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their business invoice payments"
  ON invoice_payments
  FOR ALL
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their business invoice logs"
  ON invoice_logs
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT ALL ON invoice_sequences TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT ALL ON invoice_payments TO authenticated;
GRANT ALL ON invoice_logs TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_invoice_totals TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invoice TO authenticated;