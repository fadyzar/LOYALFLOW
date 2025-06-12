import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Phone, Trash2 } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  email: string;
  phone: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export function StaffSection() {
  const { business } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    if (business?.id) {
      fetchStaff();
    }
  }, [business?.id]);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', business?.id)
        .order('created_at');

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת אנשי הצוות');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!business?.id) return;

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            business_id: business.id,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      // 2. Create staff record
      const { error: staffError } = await supabase
        .from('users')
        .insert([{
          id: authData.user?.id,
          email: formData.email,
          phone: formData.phone,
          role: 'staff',
          business_id: business.id
        }]);

      if (staffError) throw staffError;

      toast.success('איש צוות נוסף בהצלחה');
      setShowForm(false);
      setFormData({ email: '', phone: '', password: '' });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בהוספת איש צוות');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את איש הצוות?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('איש הצוות נמחק בהצלחה');
      fetchStaff();
    } catch (error) {
      toast.error('שגיאה במחיקת איש הצוות');
    }
  };

  return (
    <SettingsSection title="צוות" icon={Users}>
      <div className="space-y-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          הוסף איש צוות
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
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    סיסמה
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  הוסף איש צוות
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((member) => (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {member.role === 'admin' ? 'מנהל' : 'איש צוות'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}