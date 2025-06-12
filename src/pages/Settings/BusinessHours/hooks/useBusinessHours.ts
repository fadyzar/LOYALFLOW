// נעדכן את הלוגיקה של שמירת השינויים:

const updateHours = async (dayOfWeek: number, field: string, value: any) => {
  if (!businessId) return;

  try {
    const updatedHours = hours.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    );
    setHours(updatedHours);

    const currentHours = updatedHours.find(h => h.day_of_week === dayOfWeek);
    if (!currentHours) return;

    const { error } = await supabase
      .from('business_hours')
      .upsert({
        business_id: businessId,
        day_of_week: dayOfWeek,
        start_time: currentHours.start_time,
        end_time: currentHours.end_time,
        is_active: currentHours.is_active
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating hours:', error);
    toast.error('שגיאה בעדכון השעות');
  }
};

const addBreak = async (breakData: Omit<Break, 'id'>) => {
  if (!businessId) return false;

  try {
    const { data, error } = await supabase
      .from('business_breaks')
      .insert([{
        business_id: businessId,
        day_of_week: breakData.day_of_week,
        start_time: breakData.start_time,
        end_time: breakData.end_time
      }])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('No data returned');

    setBreaks([...breaks, data]);
    toast.success('ההפסקה נוספה בהצלחה');
    return true;
  } catch (error) {
    console.error('Error adding break:', error);
    toast.error('שגיאה בהוספת ההפסקה');
    return false;
  }
};

// שאר הקוד נשאר אותו דבר...