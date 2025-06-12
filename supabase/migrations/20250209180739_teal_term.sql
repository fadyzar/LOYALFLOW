-- Create function to get starting number for document type
CREATE OR REPLACE FUNCTION get_document_starting_number(
  p_business_id uuid,
  p_type text
) RETURNS integer AS $$
DECLARE
  v_settings jsonb;
  v_starting_number integer;
BEGIN
  -- Get business settings
  SELECT settings->'invoice_settings'->'document_numbers'
  INTO v_settings
  FROM businesses
  WHERE id = p_business_id;

  -- Get starting number based on document type
  v_starting_number := CASE p_type
    WHEN 'invoice_receipt' THEN (v_settings->>'invoice_receipt')::integer
    WHEN 'invoice' THEN (v_settings->>'invoice')::integer
    WHEN 'receipt' THEN (v_settings->>'receipt')::integer
    WHEN 'credit_note' THEN (v_settings->>'credit_note')::integer
    ELSE 50000
  END;

  RETURN COALESCE(v_starting_number, 50000);
END;
$$ LANGUAGE plpgsql;

-- Update generate_invoice_number function to use settings
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_business_id uuid,
  p_type text DEFAULT 'invoice'
) RETURNS text AS $$
DECLARE
  v_year integer;
  v_sequence invoice_sequences%ROWTYPE;
  v_next_number integer;
  v_starting_number integer;
  v_prefix text;
  v_number text;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get starting number from settings
  v_starting_number := get_document_starting_number(p_business_id, p_type);
  
  -- Get or create sequence for this business and year
  SELECT * INTO v_sequence
  FROM invoice_sequences
  WHERE business_id = p_business_id AND year = v_year
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO invoice_sequences (business_id, year, last_number)
    VALUES (p_business_id, v_year, v_starting_number - 1)
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
    WHEN 'invoice_receipt' THEN 'INV'
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

-- Create function to decrement product stock
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id uuid,
  p_quantity integer
) RETURNS integer AS $$
DECLARE
  v_current_stock integer;
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO v_current_stock
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Check if we have enough stock
  IF v_current_stock < p_quantity THEN
    RAISE EXCEPTION 'Not enough stock available';
  END IF;

  -- Update stock
  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id;

  -- Return new stock level
  RETURN v_current_stock - p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_document_starting_number TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock TO authenticated;