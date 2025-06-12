-- Update channel type check
ALTER TABLE notification_templates 
DROP CONSTRAINT IF EXISTS notification_templates_channel_check;

ALTER TABLE notification_templates 
ADD CONSTRAINT notification_templates_channel_check 
CHECK (channel IN ('sms', 'email', 'whatsapp'));

-- Update default settings structure
ALTER TABLE notification_settings 
ALTER COLUMN settings SET DEFAULT jsonb_build_object(
  'reminders', jsonb_build_object(
    'enabled', true,
    'send_before_minutes', 1440,
    'channels', ARRAY['sms']
  ),
  'confirmations', jsonb_build_object(
    'enabled', true,
    'require_customer_confirmation', true,
    'auto_confirm_after_minutes', 1440,
    'channels', ARRAY['sms']
  )
);

-- Create validation function for time values
CREATE OR REPLACE FUNCTION validate_time_settings()
RETURNS trigger AS $$
BEGIN
  -- Validate reminders
  IF NEW.settings->'reminders'->>'enabled' = 'true' AND
     ((NEW.settings->'reminders'->>'send_before_minutes')::int < 30 OR 
      (NEW.settings->'reminders'->>'send_before_minutes')::int > 4320) THEN
    RAISE EXCEPTION 'זמן תזכורת חייב להיות בין חצי שעה ל-72 שעות';
  END IF;

  -- Validate confirmations
  IF NEW.settings->'confirmations'->>'require_customer_confirmation' = 'true' AND
     (NEW.settings->'confirmations'->>'auto_confirm_after_minutes')::int > 0 AND
     ((NEW.settings->'confirmations'->>'auto_confirm_after_minutes')::int < 30 OR 
      (NEW.settings->'confirmations'->>'auto_confirm_after_minutes')::int > 4320) THEN
    RAISE EXCEPTION 'זמן אישור אוטומטי חייב להיות בין חצי שעה ל-72 שעות';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_time_settings_trigger ON notification_settings;
CREATE TRIGGER validate_time_settings_trigger
  BEFORE INSERT OR UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_time_settings();

-- Update existing settings to new structure
UPDATE notification_settings
SET settings = jsonb_build_object(
  'reminders', jsonb_build_object(
    'enabled', COALESCE((settings->'reminders'->>'enabled')::boolean, true),
    'send_before_minutes', COALESCE((settings->'reminders'->>'send_before_minutes')::int, 1440),
    'channels', COALESCE(settings->'reminders'->'channels', '["sms"]'::jsonb)
  ),
  'confirmations', jsonb_build_object(
    'enabled', COALESCE((settings->'confirmations'->>'enabled')::boolean, true),
    'require_customer_confirmation', COALESCE((settings->'confirmations'->>'require_customer_confirmation')::boolean, true),
    'auto_confirm_after_minutes', COALESCE((settings->'confirmations'->>'auto_confirm_after_minutes')::int, 1440),
    'channels', COALESCE(settings->'confirmations'->'channels', '["sms"]'::jsonb)
  )
);

-- Update default templates function
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
    ARRAY['business_name', 'date', 'time', 'staff_name', 'confirmation_link']
  ),
  (
    business_id,
    'appointment_confirmation',
    'sms',
    'תודה שקבעת תור ב-{{business_name}}! התור שלך נקבע ליום {{date}} בשעה {{time}} עם {{staff_name}}.',
    ARRAY['business_name', 'date', 'time', 'staff_name']
  );

  -- Email Templates
  INSERT INTO notification_templates (business_id, type, channel, subject, body, variables) VALUES
  (
    business_id,
    'appointment_reminder',
    'email',
    'תזכורת לתור ב-{{business_name}}',
    '<h2>תזכורת לתור</h2><p>שלום {{customer_name}},</p><p>זוהי תזכורת לתור שקבעת ב-{{business_name}} ביום {{date}} בשעה {{time}} עם {{staff_name}}.</p><p>לאישור התור: <a href="{{confirmation_link}}">לחץ כאן</a></p>',
    ARRAY['business_name', 'customer_name', 'date', 'time', 'staff_name', 'confirmation_link']
  ),
  (
    business_id,
    'appointment_confirmation',
    'email',
    'אישור תור ב-{{business_name}}',
    '<h2>אישור תור</h2><p>שלום {{customer_name}},</p><p>תודה שקבעת תור ב-{{business_name}}!</p><p>פרטי התור:<br>תאריך: {{date}}<br>שעה: {{time}}<br>עם: {{staff_name}}</p>',
    ARRAY['business_name', 'customer_name', 'date', 'time', 'staff_name']
  );

  -- WhatsApp Templates
  INSERT INTO notification_templates (business_id, type, channel, body, variables) VALUES
  (
    business_id,
    'appointment_reminder',
    'whatsapp',
    'תזכורת: יש לך תור ב-{{business_name}} ביום {{date}} בשעה {{time}} עם {{staff_name}}. לאישור התור: {{confirmation_link}}',
    ARRAY['business_name', 'date', 'time', 'staff_name', 'confirmation_link']
  ),
  (
    business_id,
    'appointment_confirmation',
    'whatsapp',
    'תודה שקבעת תור ב-{{business_name}}! התור שלך נקבע ליום {{date}} בשעה {{time}} עם {{staff_name}}.',
    ARRAY['business_name', 'date', 'time', 'staff_name']
  );
END;
$$ LANGUAGE plpgsql;