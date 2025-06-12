import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Mail, Phone, Trash2, User, Edit2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { StaffMember, StaffFormData } from './types';
import { validateStaffForm } from './validation';
import { StaffForm } from './components/StaffForm';
import toast from 'react-hot-toast';

const defaultFormData: StaffFormData = {
  email: '',
  name: '',
  password: '',
  phone: '',
  title: '',
  description: '',
  specialties: [],
  settings: {
    rest_time: 15,
    max_daily_appointments: null,
    visible_in_public: true
  },
  profile_image: null,
  services: [],
  hours: {
    use_business_hours: true,
    special_dates: []
  }
};

function BusinessStaff() {
  const { user, business } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [services, setServices] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(defaultFormData);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchBusinessId = async () => {
      try {
        if (business?.id) {
          setBusinessId(business.id);
          loadData(business.id);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        
        if (userData?.business_id) {
          setBusinessId(userData.business_id);
          loadData(userData.business_id);
        }
      } catch (error) {
        console.error('Error fetching business ID:', error);
        toast.error('שגיאה בטעינת נתוני העסק');
        setLoading(false);
      }
    };

    fetchBusinessId();
  }, [user?.id, business?.id]);

  const loadData = async (businessId: string) => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          role,
          title,
          profile_image_url,
          specialties,
          settings
        `)
        .eq('business_id', businessId)
        .in('role', ['staff', 'admin'])
        .order('created_at');
      
      if (staffError) throw staffError;
      
      if (!staffData || staffData.length === 0) {
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('business_id', businessId)
          .eq('role', 'admin')
          .single();

        if (adminError) throw adminError;
        setStaff([adminData]);
      } else {
        setStaff(staffData);
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('name_he');

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      const { data: specialtiesData, error: specialtiesError } = await supabase
        .from('staff_specialties')
        .select('*')
        .eq('business_id', businessId)
        .order('name_he');

      if (specialtiesError) throw specialtiesError;
      setSpecialties(specialtiesData || []);

    } catch (error: any) {
      console.error('Error in loadData:', error);
      toast.error(error.message || 'שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (member: StaffMember) => {
    setEditingStaff(member);
    
    try {
      const { data: staffServices, error: servicesError } = await supabase
        .from('staff_services')
        .select('*')
        .eq('staff_id', member.id);

      if (servicesError) throw servicesError;

      const { data: staffHours, error: hoursError } = await supabase
        .from('staff_hours')
        .select('*')
        .eq('staff_id', member.id)
        .maybeSingle();

      if (hoursError && hoursError.code !== 'PGRST116') {
        throw hoursError;
      }

      setFormData({
        email: member.email,
        name: member.name,
        phone: member.phone || '',
        title: member.title || '',
        description: member.description || '',
        specialties: member.specialties || [],
        settings: member.settings || defaultFormData.settings,
        services: staffServices?.map(service => ({
          id: service.service_id,
          price: service.price?.toString() ?? '',
          duration: service.duration?.toString() ?? '',
          is_active: service.is_active
        })) || [],
        hours: staffHours ? {
          use_business_hours: false,
          regular_hours: staffHours.regular_hours,
          special_dates: staffHours.special_dates
        } : defaultFormData.hours
      });
      setShowForm(true);
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast.error('שגיאה בטעינת נתוני איש הצוות');
    }
  };

  const handleSubmit = async () => {
    if (!businessId) return;

    const validationError = validateStaffForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      if (editingStaff) {
        let profileImageUrl = editingStaff.profile_image_url;
        if (formData.profile_image) {
          const fileExt = formData.profile_image.name.split('.').pop();
          const filePath = `${businessId}/staff/${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(filePath, formData.profile_image);

          if (uploadError) throw uploadError;

          const { data } = supabase.storage
            .from('profiles')
            .getPublicUrl(filePath);

          profileImageUrl = data.publicUrl;

          if (editingStaff.profile_image_url) {
            const oldPath = editingStaff.profile_image_url.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from('profiles')
                .remove([`${businessId}/staff/${oldPath}`]);
            }
          }
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: formData.name,
            phone: formData.phone,
            title: formData.title,
            description: formData.description,
            specialties: formData.specialties,
            settings: formData.settings,
            profile_image_url: profileImageUrl
          })
          .eq('id', editingStaff.id);

        if (updateError) throw updateError;

        // Update staff services
        const { error: deleteServicesError } = await supabase
          .from('staff_services')
          .delete()
          .eq('staff_id', editingStaff.id);

        if (deleteServicesError) {
          console.error('Error deleting services:', deleteServicesError);
          toast.error('שגיאה במחיקת השירותים הקיימים');
          return;
        }

        for (const service of formData.services) {
          if (service.is_active) {
            const { error: serviceError } = await supabase
              .from('staff_services')
              .insert({
                staff_id: editingStaff.id,
                service_id: service.id,
                price: service.price ? parseFloat(service.price) : null,
                duration: service.duration || null,
                is_active: true
              });

            if (serviceError) throw serviceError;
          }
        }

        // Update staff hours
        if (!formData.hours.use_business_hours) {
          const { error: deleteError } = await supabase
            .from('staff_hours')
            .delete()
            .eq('staff_id', editingStaff.id);

          if (deleteError) {
            console.error('Error deleting hours:', deleteError);
            toast.error('שגיאה במחיקת שעות העבודה הקיימות');
            return;
          }

          const { error: insertError } = await supabase
            .from('staff_hours')
            .insert({
              staff_id: editingStaff.id,
              regular_hours: formData.hours.regular_hours,
              special_dates: formData.hours.special_dates
            });

          if (insertError) {
            console.error('Error inserting hours:', insertError);
            toast.error('שגיאה בהוספת שעות העבודה החדשות');
            return;
          }
        }

        toast.success('איש הצוות עודכן בהצלחה');
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password!,
          options: {
            emailRedirectTo: undefined,
            data: {
              name: formData.name,
              phone: formData.phone,
              role: 'staff'
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          let profileImageUrl = null;
          if (formData.profile_image) {
            const fileExt = formData.profile_image.name.split('.').pop();
            const filePath = `${businessId}/staff/${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('profiles')
              .upload(filePath, formData.profile_image);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
              .from('profiles')
              .getPublicUrl(filePath);

            profileImageUrl = data.publicUrl;
          }

          const { error: staffError } = await supabase
            .from('users')
            .update({
              name: formData.name,
              phone: formData.phone,
              title: formData.title,
              description: formData.description,
              specialties: formData.specialties,
              settings: formData.settings,
              profile_image_url: profileImageUrl,
              role: 'staff',
              business_id: businessId
            })
            .eq('id', authData.user.id);

          if (staffError) throw staffError;

          for (const service of formData.services) {
            if (service.is_active) {
              const { error: serviceError } = await supabase
                .from('staff_services')
                .insert({
                  staff_id: authData.user.id,
                  service_id: service.id,
                  price: service.price ? parseFloat(service.price) : null,
                  duration: service.duration || null,
                  is_active: true
                });

              if (serviceError) throw serviceError;
            }
          }

          if (!formData.hours.use_business_hours) {
            const { error: hoursError } = await supabase
              .from('staff_hours')
              .insert({
                staff_id: authData.user.id,
                regular_hours: formData.hours.regular_hours,
                special_dates: formData.hours.special_dates
              });

            if (hoursError) throw hoursError;
          }

          toast.success('איש הצוות נוסף בהצלחה');
        }
      }

      setShowForm(false);
      setEditingStaff(null);
      setFormData(defaultFormData);
      loadData(businessId);
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      toast.error(error.message || 'שגיאה בשמירת איש הצוות');
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
      loadData(businessId!);
    } catch (error) {
      toast.error('שגיאה במחיקת איש הצוות');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 pb-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">טוען נתונים...</p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 pb-24">
        <p className="text-gray-500">לא נמצא עסק מקושר</p>
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
            <h1 className="text-2xl font-bold">צוות</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingStaff(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            איש צוות חדש
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <StaffForm
            formData={formData}
            services={services}
            specialties={specialties}
            isEditing={!!editingStaff}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingStaff(null);
              setFormData(defaultFormData);
            }}
            existingImageUrl={editingStaff?.profile_image_url}
          />
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
              <div className="flex items-center gap-4">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="font-medium">{member.name}</h3>
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
                  {member.title && (
                    <div className="text-sm text-gray-500">
                      {member.title}
                    </div>
                  )}
                  {member.specialties && member.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {member.specialties.slice(0, 3).map((specialty, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {specialty.length > 12 ? `${specialty.slice(0, 12)}...` : specialty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(member)}
                  className="p-1 text-gray-400 hover:text-indigo-600"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                member.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {member.role === 'admin' ? 'מנהל' : 'איש צוות'}
              </span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {member.settings?.use_business_hours ? 'שעות העסק' : 'שעות מותאמות אישית'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {staff.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-gray-500">לא נמצאו אנשי צוות</p>
          <button
            onClick={() => {
              setEditingStaff(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            הוסף איש צוות חדש
          </button>
        </div>
      )}
    </div>
  );
}

export default BusinessStaff;