import React, { useState, useEffect } from 'react';
import { Scissors, Plus, Edit2, Trash2 } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  name_he: string;
  price: number;
  duration: string;
}

export function ServicesSection() {
  const { business } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_he: '',
    price: '',
    duration: '30'
  });

  useEffect(() => {
    if (business?.id) {
      fetchServices();
    }
  }, [business?.id]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business?.id)
        .order('name_he');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת השירותים');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        business_id: business?.id,
        name: formData.name,
        name_he: formData.name_he,
        price: parseFloat(formData.price),
        duration: `${formData.duration} minutes`
      };

      const { error } = editingService
        ? await supabase
            .from('services')
            .update(serviceData)
            .eq('id', editingService.id)
        : await supabase
            .from('services')
            .insert([serviceData]);

      if (error) throw error;

      toast.success(editingService ? 'השירות עודכן בהצלחה' : 'השירות נוסף בהצלחה');
      setShowForm(false);
      setEditingService(null);
      setFormData({ name: '', name_he: '', price: '', duration: '30' });
      fetchServices();
    } catch (error) {
      toast.error('שגיאה בשמירת השירות');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      name_he: service.name_he,
      price: service.price.toString(),
      duration: service.duration.replace(' minutes', '')
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השירות?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('השירות נמחק בהצלחה');
      fetchServices();
    } catch (error) {
      toast.error('שגיאה במחיקת השירות');
    }
  };

  return (
    <SettingsSection title="שירותים" icon={Scissors}>
      <div className="space-y-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingService(null);
            setFormData({ name: '', name_he: '', price: '', duration: '30' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          שירות חדש
        </motion.button>

        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 p-6 rounded-xl space-y-4"
              onSubmit={handleSubmit}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם השירות בעברית
                  </label>
                  <input
                    type="text"
                    value={formData.name_he}
                    onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם השירות באנגלית
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מחיר
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    משך זמן (דקות)
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="15">15 דקות</option>
                    <option value="30">30 דקות</option>
                    <option value="45">45 דקות</option>
                    <option value="60">שעה</option>
                    <option value="90">שעה וחצי</option>
                    <option value="120">שעתיים</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingService(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingService ? 'עדכן' : 'הוסף'} שירות
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <motion.div
              key={service.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{service.name_he}</h3>
                  <p className="text-sm text-gray-500">{service.name}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-indigo-600 font-medium">₪{service.price}</span>
                <span className="text-gray-500">{service.duration.replace('minutes', 'דקות')}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}