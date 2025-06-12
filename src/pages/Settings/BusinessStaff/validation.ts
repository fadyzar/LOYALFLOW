export function validateStaffForm(data: StaffFormData): string | null {
  // Validate email
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'כתובת אימייל לא תקינה';
  }

  // Validate password if provided (new staff member)
  if (data.password !== undefined && data.password.length < 6) {
    return 'הסיסמה חייבת להכיל לפחות 6 תווים';
  }

  // Validate phone if provided
  if (data.phone && !/^05\d{8}$/.test(data.phone)) {
    return 'מספר טלפון לא תקין';
  }

  // Validate rest time
  if (data.settings.rest_time < 0 || data.settings.rest_time > 60) {
    return 'זמן מנוחה חייב להיות בין 0 ל-60 דקות';
  }

  // Validate services
  for (const service of data.services) {
    if (service.is_active) {
      const price = parseFloat(service.price);
      if (isNaN(price) || price < 0) {
        return 'מחיר השירות חייב להיות מספר חיובי';
      }
    }
  }

  // Validate working hours if custom hours are used
  if (!data.hours.use_business_hours && data.hours.regular_hours) {
    for (const [day, hours] of Object.entries(data.hours.regular_hours)) {
      if (hours.is_active) {
        // Validate start time is before end time
        if (hours.start_time >= hours.end_time) {
          return `שעת התחלה חייבת להיות לפני שעת סיום ביום ${day}`;
        }

        // Validate breaks
        let lastBreakEnd = hours.start_time;
        for (const breakItem of hours.breaks) {
          if (breakItem.start_time <= lastBreakEnd) {
            return `הפסקות לא יכולות לחפוף ביום ${day}`;
          }
          if (breakItem.start_time >= breakItem.end_time) {
            return `שעת התחלה של הפסקה חייבת להיות לפני שעת הסיום ביום ${day}`;
          }
          if (breakItem.start_time < hours.start_time || 
              breakItem.end_time > hours.end_time) {
            return `הפסקה חייבת להיות בתוך שעות העבודה ביום ${day}`;
          }
          lastBreakEnd = breakItem.end_time;
        }
      }
    }
  }

  return null;
}