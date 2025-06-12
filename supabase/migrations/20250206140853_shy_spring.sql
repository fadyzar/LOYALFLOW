-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  customer_id uuid REFERENCES customers(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('invoice', 'receipt', 'credit_note', 'other')),
  title text NOT NULL,
  number text,
  amount decimal(10,2),
  status text NOT NULL CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  file_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document_items table
CREATE TABLE IF NOT EXISTS document_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services(id),
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value decimal(10,2),
  tax_rate decimal(5,2) DEFAULT 17.00,
  total decimal(10,2) NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create document_payments table
CREATE TABLE IF NOT EXISTS document_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'bank_transfer', 'check', 'other')),
  payment_date timestamptz NOT NULL,
  reference text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create storage bucket for documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', false);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_payments ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_documents_business ON documents(business_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_number ON documents(number);
CREATE INDEX idx_document_items_document ON document_items(document_id);
CREATE INDEX idx_document_payments_document ON document_payments(document_id);

-- Create policies
CREATE POLICY "Users can view their business documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business documents"
  ON documents
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

CREATE POLICY "Users can view their business document items"
  ON document_items
  FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their business document items"
  ON document_items
  FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their business document payments"
  ON document_payments
  FOR SELECT
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their business document payments"
  ON document_payments
  FOR ALL
  TO authenticated
  USING (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    document_id IN (
      SELECT id FROM documents WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create policies for document storage
CREATE POLICY "Users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can read their business documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM users WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON documents TO authenticated;
GRANT ALL ON document_items TO authenticated;
GRANT ALL ON document_payments TO authenticated;