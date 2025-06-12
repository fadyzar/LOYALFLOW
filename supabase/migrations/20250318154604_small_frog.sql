-- Drop existing objects if they exist
DROP TRIGGER IF EXISTS set_business_message_month_year_trigger ON business_chat_messages;
DROP FUNCTION IF EXISTS set_business_message_month_year();
DROP FUNCTION IF EXISTS get_user_monthly_messages(uuid, uuid, text);
DROP FUNCTION IF EXISTS log_business_message(uuid, uuid, text, text);

-- Create business_chat_messages table
CREATE TABLE IF NOT EXISTS business_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  message text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text', 'audio')),
  sent_at timestamptz DEFAULT now(),
  month_year text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create function to set month_year before insert
CREATE OR REPLACE FUNCTION set_business_message_month_year()
RETURNS trigger AS $$
BEGIN
  NEW.month_year := to_char(NEW.sent_at, 'YYYY-MM');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set month_year
CREATE TRIGGER set_business_message_month_year_trigger
  BEFORE INSERT ON business_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION set_business_message_month_year();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_chat_messages_business ON business_chat_messages(business_id);
CREATE INDEX IF NOT EXISTS idx_business_chat_messages_user ON business_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_business_chat_messages_month ON business_chat_messages(month_year);

-- Enable RLS
ALTER TABLE business_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their business chat messages" ON business_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages" ON business_chat_messages;

-- Create policies
CREATE POLICY "Users can view their business chat messages"
  ON business_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chat messages"
  ON business_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create function to get user monthly message count
CREATE OR REPLACE FUNCTION get_user_monthly_messages(
  p_user_id uuid,
  p_business_id uuid,
  p_month text DEFAULT to_char(now(), 'YYYY-MM')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_messages integer;
  v_remaining_messages integer;
  v_monthly_limit integer := 400;
BEGIN
  -- Get total messages for the month
  SELECT COUNT(*)
  INTO v_total_messages
  FROM business_chat_messages
  WHERE user_id = p_user_id
  AND business_id = p_business_id
  AND month_year = p_month;

  -- Calculate remaining messages
  v_remaining_messages := GREATEST(0, v_monthly_limit - v_total_messages);

  -- Return results
  RETURN jsonb_build_object(
    'total_messages', v_total_messages,
    'remaining_messages', v_remaining_messages,
    'monthly_limit', v_monthly_limit,
    'month_year', p_month
  );
END;
$$;

-- Create function to log business message
CREATE OR REPLACE FUNCTION log_business_message(
  p_user_id uuid,
  p_business_id uuid,
  p_message text,
  p_message_type text DEFAULT 'text'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_count jsonb;
  v_current_month text;
BEGIN
  -- Get current month
  v_current_month := to_char(now(), 'YYYY-MM');
  
  -- Get current message count
  v_message_count := get_user_monthly_messages(p_user_id, p_business_id, v_current_month);
  
  -- Check if limit reached
  IF (v_message_count->>'remaining_messages')::int <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'הגעת למגבלת ההודעות החודשית',
      'message_count', v_message_count
    );
  END IF;

  -- Log message
  INSERT INTO business_chat_messages (
    business_id,
    user_id,
    message,
    message_type,
    month_year
  ) VALUES (
    p_business_id,
    p_user_id,
    p_message,
    p_message_type,
    v_current_month
  );

  -- Get updated count
  v_message_count := get_user_monthly_messages(p_user_id, p_business_id, v_current_month);

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message_count', v_message_count
  );
END;
$$;

-- Grant permissions
GRANT ALL ON business_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_monthly_messages TO authenticated;
GRANT EXECUTE ON FUNCTION log_business_message TO authenticated;