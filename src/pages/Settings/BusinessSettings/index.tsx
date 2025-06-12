import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { BusinessLogo } from './components/BusinessLogo';
import { ContactInfo } from './components/ContactInfo';
import { BookingLink } from './components/BookingLink';
import toast from 'react-hot-toast';

export default function BusinessSettings() {
  const { user, loading: authLoading } = useAuth();
  const [businessData, setBusinessData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<{
    name?: string;
    logo_url?: string | null;
    booking_link?: string;
    contact_info?: any;
  }>({});

  const loadBusinessData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', userData.business_id)
        .single();

      if (businessError) throw businessError;

      setBusinessData(businessData);
      setPendingChanges({});
      setHasChanges(false);
    } catch (error) {
      console.error('Error loading business data:', error);
      toast.error('שגיאה בטעינת נתוני העסק');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinessData();
  }, [user?.id]);

  const handleNameChange = (name: string) => {
    setPendingChanges(prev => ({ ...prev, name }));
    setHasChanges(true);
  };

  const handleLogoChange = async (logoUrl: string) => {
    setPendingChanges(prev => ({ ...prev, logo_url: logoUrl }));
    setHasChanges(true);
  };

  const handleBookingLinkChange = (bookingLink: string) => {
    setPendingChanges(prev => ({ ...prev, booking_link: bookingLink }));
    setHasChanges(true);
  };

  const handleContactInfoChange = (contactInfo: any) => {
    setPendingChanges(prev => ({ ...prev, contact_info: contactInfo }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!businessData?.id || !hasChanges || saving) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('businesses')
        .update({
          ...pendingChanges
        })
        .eq('id', businessData.id);

      if (error) throw error;

      toast.success('הפרטים נשמרו בהצלחה');
      await loadBusinessData();
    } catch (error: any) {
      console.error('Error saving business settings:', error);
      toast.error(error.message || 'שגיאה בשמירת הפרטים');
      await loadBusinessData();
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <p className="text-red-500">לא נמצאו נתוני עסק</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          טען מחדש
        </button>
      </div>
    );
  }

  const displayData = {
    ...businessData,
    ...pendingChanges
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold">הגדרות עסק</h1>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
              hasChanges 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם העסק
            </label>
            <input
              type="text"
              value={displayData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="הזן את שם העסק"
            />
          </div>

          <BusinessLogo 
            business={displayData} 
            onLogoChange={handleLogoChange} 
          />
          <BookingLink 
            bookingLink={displayData.booking_link}
            businessId={displayData.id}
            onBookingLinkChange={handleBookingLinkChange} 
          />
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">פרטי קשר</h2>
            <ContactInfo 
              contactInfo={displayData.contact_info} 
              onChange={handleContactInfoChange} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}