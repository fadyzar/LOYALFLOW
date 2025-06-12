-- Add business type to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'licensed';

-- Add constraint for business type
ALTER TABLE businesses
ADD CONSTRAINT valid_business_type CHECK (business_type IN ('licensed', 'exempt'));

-- Add is_original and digital_signature to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_original boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS digital_signature text;

-- Drop existing type constraint if exists
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_type_check;

-- Add new type constraint with updated values
ALTER TABLE invoices
ADD CONSTRAINT invoices_type_check 
CHECK (type IN ('invoice', 'receipt', 'credit_note', 'proforma', 'invoice_receipt'));

-- Create function to generate digital signature
CREATE OR REPLACE FUNCTION generate_digital_signature(p_invoice_id uuid)
RETURNS text AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_items_json text;
  v_signature_data text;
BEGIN
  -- Get invoice data
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  -- Get items as JSON string
  SELECT string_agg(row_to_json(i)::text, ',')
  INTO v_items_json
  FROM (
    SELECT id, description, quantity, unit_price, total
    FROM invoice_items
    WHERE invoice_id = p_invoice_id
    ORDER BY id
  ) i;
  
  -- Combine all relevant data for signature
  v_signature_data := v_invoice.business_id || '|' ||
                     v_invoice.number || '|' ||
                     v_invoice.created_at || '|' ||
                     v_invoice.total || '|' ||
                     COALESCE(v_items_json, '');
  
  -- Generate signature using SHA-256
  -- In production, this should use proper RSA signing
  RETURN encode(digest(v_signature_data, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Create function to finalize invoice
CREATE OR REPLACE FUNCTION finalize_invoice(p_invoice_id uuid)
RETURNS void AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_business businesses%ROWTYPE;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  -- Get business details
  SELECT * INTO v_business
  FROM businesses
  WHERE id = v_invoice.business_id;
  
  -- Validate invoice
  PERFORM validate_invoice(p_invoice_id);
  
  -- Set tax rate based on business type
  UPDATE invoice_items
  SET 
    tax_rate = CASE 
      WHEN v_business.business_type = 'exempt' THEN 0
      ELSE tax_rate
    END,
    tax_amount = CASE 
      WHEN v_business.business_type = 'exempt' THEN 0
      ELSE (total * tax_rate / 100)
    END
  WHERE invoice_id = p_invoice_id;
  
  -- Recalculate totals
  PERFORM calculate_invoice_totals(p_invoice_id);
  
  -- For invoice_receipt type, set payment details
  IF v_invoice.type = 'invoice_receipt' AND v_invoice.payment_method IS NOT NULL THEN
    UPDATE invoices
    SET 
      paid_at = COALESCE(paid_at, now()),
      status = 'paid'
    WHERE id = p_invoice_id;
  END IF;
  
  -- Generate digital signature
  UPDATE invoices
  SET 
    digital_signature = generate_digital_signature(p_invoice_id),
    status = 'issued',
    updated_at = now()
  WHERE id = p_invoice_id;
  
  -- Log the action
  INSERT INTO invoice_logs (
    invoice_id,
    action,
    details,
    performed_by
  ) VALUES (
    p_invoice_id,
    'finalize',
    jsonb_build_object(
      'status', 'issued',
      'digital_signature', generate_digital_signature(p_invoice_id)
    ),
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to create copy of invoice
CREATE OR REPLACE FUNCTION create_invoice_copy(p_invoice_id uuid)
RETURNS uuid AS $$
DECLARE
  v_original invoices%ROWTYPE;
  v_copy_id uuid;
BEGIN
  -- Get original invoice
  SELECT * INTO v_original
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  -- Create copy with is_original = false
  INSERT INTO invoices (
    business_id,
    customer_id,
    number,
    type,
    status,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    notes,
    payment_method,
    payment_reference,
    due_date,
    paid_at,
    cancelled_at,
    original_invoice_id,
    pdf_url,
    metadata,
    is_original,
    digital_signature
  )
  VALUES (
    v_original.business_id,
    v_original.customer_id,
    v_original.number,
    v_original.type,
    v_original.status,
    v_original.subtotal,
    v_original.tax_rate,
    v_original.tax_amount,
    v_original.total,
    v_original.notes,
    v_original.payment_method,
    v_original.payment_reference,
    v_original.due_date,
    v_original.paid_at,
    v_original.cancelled_at,
    v_original.id,
    v_original.pdf_url,
    v_original.metadata,
    false,
    v_original.digital_signature
  )
  RETURNING id INTO v_copy_id;
  
  -- Copy items
  INSERT INTO invoice_items (
    invoice_id,
    service_id,
    product_id,
    description,
    quantity,
    unit_price,
    discount_type,
    discount_value,
    tax_rate,
    tax_amount,
    total,
    metadata
  )
  SELECT
    v_copy_id,
    service_id,
    product_id,
    description,
    quantity,
    unit_price,
    discount_type,
    discount_value,
    tax_rate,
    tax_amount,
    total,
    metadata
  FROM invoice_items
  WHERE invoice_id = p_invoice_id;
  
  -- Log the action
  INSERT INTO invoice_logs (
    invoice_id,
    action,
    details,
    performed_by
  ) VALUES (
    v_copy_id,
    'create_copy',
    jsonb_build_object(
      'original_id', p_invoice_id,
      'is_original', false
    ),
    auth.uid()
  );
  
  RETURN v_copy_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to new functions
GRANT EXECUTE ON FUNCTION generate_digital_signature TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_invoice TO authenticated;
GRANT EXECUTE ON FUNCTION create_invoice_copy TO authenticated;