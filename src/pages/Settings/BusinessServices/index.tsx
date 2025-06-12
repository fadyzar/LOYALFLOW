import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { Service, ServiceFormData } from './types';
import { validateServiceForm } from './validation';
import { ServiceForm } from './components/ServiceForm';
import { ServiceCard } from './components/ServiceCard';
import toast from 'react-hot-toast';

const defaultFormData: ServiceFormData = {
  name_he: '',
  price: '',
  duration: '30',
  image: null,
  description: '',
  promotion: undefined
};

function BusinessServices() {
  const { user, business, loading: authLoading } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);

  useEffect(() => {
    const loadServices = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        let businessId = business?.id;
        if (!businessId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          businessId = userData?.business_id;
        }

        if (!businessId) {
          throw new Error('לא נמצא עסק מקושר');
        }

        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at');

        if (error) throw error;
        setServices(data || []);
      } catch (error: any) {
        console.error('Error loading services:', error);
        toast.error('שגיאה בטעינת השירותים');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [user?.id, business?.id, authLoading]);

  const uploadImage = async (file: File, businessId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
      const filePath = `${businessId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('services')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('services')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('שגיאה בהעלאת התמונה');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    
    // חילוץ מספר הדקות מה-interval
    const durationMatch = service.duration.match(/(\d+):(\d+):(\d+)/);
    const minutes = durationMatch 
      ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2])
      : 30; // ברירת מחדל אם יש בעיה בפירוק ה-interval

    setFormData({
      name_he: service.name_he,
      price: service.price.toString(),
      duration: minutes.toString(),
      description: service.description || '',
      promotion: service.promotion
      // לא מאתחלים את שדה התמונה בכלל כשעורכים שירות קיים
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const validationError = validateServiceForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      let businessId = business?.id;
      
      if (!businessId) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user?.id)
          .single();

        if (userError) throw new Error('לא נמצא עסק מקושר');
        businessId = userData?.business_id;
      }

      if (!businessId) {
        throw new Error('לא נמצא עסק מקושר');
      }

      let imageUrl = editingService?.image_url;

      // טיפול בתמונה רק אם יש שינוי בשדה התמונה
      if ('image' in formData) {
        // אם ביקשנו במפורש למחוק את התמונה
        if (formData.image === null) {
          if (editingService?.image_url) {
            const oldPath = editingService.image_url.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from('services')
                .remove([`${businessId}/${oldPath}`]);
            }
          }
          imageUrl = null;
        }
        // אם יש תמונה חדשה להעלות
        else if (formData.image instanceof File) {
          // מחיקת התמונה הקיימת אם יש
          if (editingService?.image_url) {
            const oldPath = editingService.image_url.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from('services')
                .remove([`${businessId}/${oldPath}`]);
            }
          }
          // העלאת התמונה החדשה
          imageUrl = await uploadImage(formData.image, businessId);
        }
      }

      // חילוץ מספר הדקות מהטופס והמרה ל-interval
      const minutes = parseInt(formData.duration);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const duration = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:00`;

      const serviceData = {
        business_id: businessId,
        name: formData.name_he,
        name_he: formData.name_he,
        price: parseFloat(formData.price),
        duration,
        image_url: imageUrl,
        description: formData.description,
        promotion: formData.promotion
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('השירות עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);

        if (error) throw error;
        toast.success('השירות נוסף בהצלחה');
      }

      setShowForm(false);
      setEditingService(null);
      setFormData(defaultFormData);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      console.error('Error saving service:', error);
      toast.error(error.message || (editingService ? 'שגיאה בעדכון השירות' : 'שגיאה בהוספת השירות'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השירות?')) return;

    try {
      const service = services.find(s => s.id === id);
      
      if (service?.image_url) {
        const businessId = business?.id;
        const oldPath = service.image_url.split('/').pop();
        if (businessId && oldPath) {
          await supabase.storage
            .from('services')
            .remove([`${businessId}/${oldPath}`]);
        }
      }

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('השירות נמחק בהצלחה');
      
      const { data, error: loadError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business?.id)
        .order('created_at');

      if (loadError) throw loadError;
      setServices(data || []);
    } catch (error) {
      toast.error('שגיאה במחיקת השירות');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center pb-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold">שירותים</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingService(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            שירות חדש
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <ServiceForm
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingService(null);
              setFormData(defaultFormData);
            }}
            isEditing={!!editingService}
            existingImageUrl={editingService?.image_url}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {services.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-gray-500">לא נמצאו שירותים</p>
          <button
            onClick={() => {
              setEditingService(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            הוסף שירות חדש
          </button>
        </div>
      )}
    </div>
  );
}

export default BusinessServices;