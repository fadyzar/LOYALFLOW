import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Image, Type, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { Preview } from './components/Preview';
import { GalleryUpload } from './components/GalleryUpload';
import toast from 'react-hot-toast';

interface Settings {
  gallery: {
    items: Array<{
      id: string;
      type: 'image' | 'video';
      url: string;
    }>;
  };
  about: {
    content: string;
  };
  social: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
}

const defaultSettings: Settings = {
  gallery: {
    items: []
  },
  about: {
    content: 'ספרו לנו קצת על העסק שלכם...'
  },
  social: {}
};

export default function ExternalPageSettings() {
  const { user, business } = useAuth();
  const [selectedTab, setSelectedTab] = useState('gallery');
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const tabs = [
    { id: 'gallery', label: 'גלריה', icon: Image },
    { id: 'content', label: 'תוכן', icon: Type },
    { id: 'social', label: 'רשתות חברתיות', icon: Share2 }
  ];

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchBusinessData = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

        setBusinessId(userData.business_id);

        // Load business data including contact info and hours
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select(`
            *,
            business_hours (
              regular_hours,
              special_dates
            )
          `)
          .eq('id', userData.business_id)
          .single();

        if (businessError) throw businessError;
        setBusinessData(businessData);

        // Load external page settings
        if (businessData?.external_page_settings) {
          setSettings({
            gallery: businessData.external_page_settings.gallery || defaultSettings.gallery,
            about: businessData.external_page_settings.about || defaultSettings.about,
            social: businessData.external_page_settings.social || defaultSettings.social
          });
        }
      } catch (error) {
        console.error('Error loading business data:', error);
        toast.error('שגיאה בטעינת נתוני העסק');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!businessId || !hasChanges) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          external_page_settings: settings
        })
        .eq('id', businessId);

      if (error) throw error;

      toast.success('ההגדרות נשמרו בהצלחה');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
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
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold">עיצוב דף חיצוני</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
              hasChanges 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            שמור שינויים
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          {selectedTab === 'gallery' && businessId && (
            <GalleryUpload
              businessId={businessId}
              items={settings.gallery.items}
              onChange={(items) => {
                setSettings(prev => ({
                  ...prev,
                  gallery: { items }
                }));
                setHasChanges(true);
              }}
            />
          )}

          {selectedTab === 'content' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תוכן
              </label>
              <textarea
                value={settings.about.content}
                onChange={(e) => {
                  setSettings(prev => ({
                    ...prev,
                    about: {
                      ...prev.about,
                      content: e.target.value
                    }
                  }));
                  setHasChanges(true);
                }}
                rows={6}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="ספרו לנו קצת על העסק שלכם..."
              />
            </div>
          )}

          {selectedTab === 'social' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  פייסבוק
                </label>
                <input
                  type="url"
                  value={settings.social.facebook || ''}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      social: {
                        ...prev.social,
                        facebook: e.target.value
                      }
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="הזן קישור לעמוד הפייסבוק..."
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אינסטגרם
                </label>
                <input
                  type="url"
                  value={settings.social.instagram || ''}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      social: {
                        ...prev.social,
                        instagram: e.target.value
                      }
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="הזן קישור לעמוד האינסטגרם..."
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  וואטסאפ
                </label>
                <input
                  type="tel"
                  value={settings.social.whatsapp || ''}
                  onChange={(e) => {
                    setSettings(prev => ({
                      ...prev,
                      social: {
                        ...prev.social,
                        whatsapp: e.target.value
                      }
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="הזן מספר טלפון..."
                  dir="ltr"
                />
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div>
          <Preview 
            settings={settings} 
            businessData={businessData}
          />
        </div>
      </div>
    </div>
  );
}