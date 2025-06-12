-- יצירת פונקציה לעדכון נתוני נאמנות
CREATE OR REPLACE FUNCTION update_customer_loyalty_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id uuid;
  v_customer_id uuid;
  v_loyalty_settings jsonb;
  v_points_per_visit integer;
  v_diamonds_per_consecutive_visits integer;
  v_consecutive_visits_required integer;
  v_customer_loyalty_stats jsonb;
  v_total_visits integer;
  v_consecutive_visits integer;
  v_last_visit timestamptz;
  v_points integer;
  v_diamonds integer;
  v_diamonds_added integer := 0;
BEGIN
  -- בדיקה אם הסטטוס שונה ל"הושלם"
  IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- קבלת מזהי העסק והלקוח
    v_business_id := NEW.business_id;
    v_customer_id := NEW.customer_id;
    
    -- קבלת הגדרות הנאמנות של העסק
    SELECT settings->'loyalty' INTO v_loyalty_settings
    FROM businesses
    WHERE id = v_business_id;
    
    -- בדיקה אם תוכנית הנאמנות מופעלת
    IF (v_loyalty_settings IS NULL OR (v_loyalty_settings->>'enabled')::boolean = false) THEN
      -- אם תוכנית הנאמנות כבויה, לא עושים כלום
      RETURN NEW;
    END IF;
    
    -- קבלת הגדרות הנקודות והיהלומים
    v_points_per_visit := COALESCE((v_loyalty_settings->'points'->>'per_visit')::integer, 10);
    v_diamonds_per_consecutive_visits := COALESCE((v_loyalty_settings->'diamonds'->>'per_consecutive_visits')::integer, 1);
    v_consecutive_visits_required := COALESCE((v_loyalty_settings->'diamonds'->>'consecutive_visits_required')::integer, 3);
    
    -- קבלת נתוני הנאמנות הנוכחיים של הלקוח
    SELECT 
      loyalty_stats,
      points,
      diamonds
    INTO 
      v_customer_loyalty_stats,
      v_points,
      v_diamonds
    FROM customers
    WHERE id = v_customer_id;
    
    -- חילוץ נתוני הנאמנות
    v_total_visits := COALESCE((v_customer_loyalty_stats->>'total_visits')::integer, 0);
    v_consecutive_visits := COALESCE((v_customer_loyalty_stats->>'consecutive_visits')::integer, 0);
    v_last_visit := (v_customer_loyalty_stats->>'last_visit')::timestamptz;
    
    -- עדכון מספר הביקורים
    v_total_visits := v_total_visits + 1;
    
    -- עדכון ביקורים רצופים
    v_consecutive_visits := v_consecutive_visits + 1;
    
    -- עדכון נקודות
    v_points := v_points + v_points_per_visit;
    
    -- עדכון יהלומים אם הגיע למספר הביקורים הרצופים הנדרש
    IF (v_consecutive_visits >= v_consecutive_visits_required) THEN
      v_diamonds_added := v_diamonds_per_consecutive_visits;
      v_diamonds := v_diamonds + v_diamonds_added;
      v_consecutive_visits := 0; -- איפוס הספירה לאחר קבלת יהלום
    END IF;
    
    -- עדכון נתוני הלקוח
    UPDATE customers
    SET 
      points = v_points,
      diamonds = v_diamonds,
      loyalty_stats = jsonb_set(
        jsonb_set(
          jsonb_set(
            v_customer_loyalty_stats,
            '{total_visits}',
            to_jsonb(v_total_visits)
          ),
          '{consecutive_visits}',
          to_jsonb(v_consecutive_visits)
        ),
        '{last_visit}',
        to_jsonb(NEW.start_time)
      ),
      updated_at = now()
    WHERE id = v_customer_id;
    
    -- הוספת לוג לעדכון הנאמנות
    INSERT INTO appointment_logs (
      appointment_id,
      action,
      details
    ) VALUES (
      NEW.id,
      'loyalty_update',
      jsonb_build_object(
        'points_added', v_points_per_visit,
        'diamonds_added', v_diamonds_added,
        'total_points', v_points,
        'total_diamonds', v_diamonds,
        'total_visits', v_total_visits,
        'consecutive_visits', v_consecutive_visits
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- יצירת טריגר לעדכון נתוני נאמנות בעת שינוי סטטוס תור
DROP TRIGGER IF EXISTS update_customer_loyalty_on_completion_trigger ON appointments;
CREATE TRIGGER update_customer_loyalty_on_completion_trigger
  AFTER UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_loyalty_on_completion();