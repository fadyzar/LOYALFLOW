-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('appointment_reminder', 'appointment_confirmation', 'appointment_cancellation', 'appointment_rescheduled')),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, type, channel)
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT jsonb_build_object(
    'reminders', jsonb_build_object(
      'enabled', true,
      'send_before_minutes', 1440, -- 24 hours by default
      'channels', ARRAY['sms']
    ),
    'confirmations', jsonb_build_object(
      'enabled', true,
      'require_customer_confirmation', true,
      'auto_confirm_after_minutes', 1440, -- 24 hours by default
      'channels', ARRAY['sms']
    ),
    'cancellations', jsonb_build_object(
      'enabled', true,
      'allow_customer_cancellation', true,
      'cancellation_deadline_hours', 24,
      'channels', ARRAY['sms']
    ),
    'working_hours', jsonb_build_object(
      'start_time', '09:00',
      'end_time', '21:00',
      'days', ARRAY[0,1,2,3,4,5,6]
    )
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_logs table for tracking
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  appointment_id uuid,
  template_id uuid REFERENCES notification_templates(id),
  type text NOT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_notification_templates_business ON notification_templates(business_id);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_logs_business ON notification_logs(business_id);
CREATE INDEX idx_notification_logs_appointment ON notification_logs(appointment_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at);

-- Create policies
CREATE POLICY "Users can view their business notification templates"
  ON notification_templates
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business notification templates"
  ON notification_templates
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

CREATE POLICY "Users can view their business notification settings"
  ON notification_settings
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business notification settings"
  ON notification_settings
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

CREATE POLICY "Users can view their business notification logs"
  ON notification_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_notification_templates_timestamp
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_timestamp();

-- Insert default templates
CREATE OR REPLACE FUNCTION create_default_notification_templates(business_id uuid)
RETURNS void AS $$
BEGIN
  -- SMS Templates
  INSERT INTO notification_templates (business_id, type, channel, body, variables) VALUES
  (
    business_id,
    'appointment_reminder',
    'sms',
    'תזכורת: יש לך תור ב-{{business_name}} ביום {{date}} בשעה {{time}} עם {{staff_name}}. לאישור התור: {{confirmation_link}}',
    '["business_name", "date", "time", "staff_name", "confirmation_link"]'::jsonb
  ),
  (
    business_id,
    'appointment_confirmation',
    'sms',
    'תודה שקבעת תור ב-{{business_name}}! התור שלך נקבע ליום {{date}} בשעה {{time}} עם {{staff_name}}.',
    '["business_name", "date", "time", "staff_name"]'::jsonb
  ),
  (
    business_id,
    'appointment_cancellation',
    'sms',
    'התור שלך ב-{{business_name}} ליום {{date}} בשעה {{time}} בוטל.',
    '["business_name", "date", "time"]'::jsonb
  ),
  (
    business_id,
    'appointment_rescheduled',
    'sms',
    'התור שלך ב-{{business_name}} הועבר ליום {{new_date}} בשעה {{new_time}}. התור המקורי היה ביום {{old_date}} בשעה {{old_time}}.',
    '["business_name", "new_date", "new_time", "old_date", "old_time"]'::jsonb
  );

  -- Email Templates
  INSERT INTO notification_templates (business_id, type, channel, subject, body, variables) VALUES
  (
    business_id,
    'appointment_reminder',
    'email',
    'תזכורת לתור ב-{{business_name}}',
    '<h2>תזכורת לתור</h2><p>שלום {{customer_name}},</p><p>זוהי תזכורת לתור שקבעת ב-{{business_name}} ביום {{date}} בשעה {{time}} עם {{staff_name}}.</p><p>לאישור התור: <a href="{{confirmation_link}}">לחץ כאן</a></p>',
    '["business_name", "customer_name", "date", "time", "staff_name", "confirmation_link"]'::jsonb
  ),
  (
    business_id,
    'appointment_confirmation',
    'email',
    'אישור תור ב-{{business_name}}',
    '<h2>אישור תור</h2><p>שלום {{customer_name}},</p><p>תודה שקבעת תור ב-{{business_name}}!</p><p>פרטי התור:<br>תאריך: {{date}}<br>שעה: {{time}}<br>עם: {{staff_name}}</p>',
    '["business_name", "customer_name", "date", "time", "staff_name"]'::jsonb
  ),
  (
    business_id,
    'appointment_cancellation',
    'email',
    'ביטול תור ב-{{business_name}}',
    '<h2>ביטול תור</h2><p>שלום {{customer_name}},</p><p>התור שלך ב-{{business_name}} ליום {{date}} בשעה {{time}} בוטל.</p>',
    '["business_name", "customer_name", "date", "time"]'::jsonb
  ),
  (
    business_id,
    'appointment_rescheduled',
    'email',
    'שינוי מועד תור ב-{{business_name}}',
    '<h2>שינוי מועד תור</h2><p>שלום {{customer_name}},</p><p>התור שלך ב-{{business_name}} הועבר ליום {{new_date}} בשעה {{new_time}}.</p><p>התור המקורי היה קבוע ליום {{old_date}} בשעה {{old_time}}.</p>',
    '["business_name", "customer_name", "new_date", "new_time", "old_date", "old_time"]'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to create default templates for new businesses
CREATE OR REPLACE FUNCTION create_business_notification_defaults()
RETURNS trigger AS $$
BEGIN
  -- Create default notification settings
  INSERT INTO notification_settings (business_id)
  VALUES (NEW.id);

  -- Create default templates
  PERFORM create_default_notification_templates(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new businesses
CREATE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_business_notification_defaults();

-- Grant permissions
GRANT ALL ON notification_templates TO authenticated;
GRANT ALL ON notification_settings TO authenticated;
GRANT ALL ON notification_logs TO authenticated;