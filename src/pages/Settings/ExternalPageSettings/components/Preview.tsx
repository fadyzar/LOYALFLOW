import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Phone, MapPin, Clock, Instagram, X, Scissors, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomerAuth } from '../../../../components/auth/CustomerAuth';

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
    instagram?: string;
    whatsapp?: string;
  };
}

interface BusinessData {
  id: string;
  name: string;
  logo_url?: string;
  booking_link: string;
  contact_info: {
    phone: string;
    address: string;
  };
  business_hours: {
    regular_hours: Record<string, {
      is_active: boolean;
      start_time: string;
      end_time: string;
      breaks: Array<{
        start_time: string;
        end_time: string;
      }>;
    }>;
    special_dates: Array<{
      date: string;
      is_closed: boolean;
      start_time?: string;
      end_time?: string;
    }>;
  };
}

interface PreviewProps {
  settings: Settings;
  businessData: BusinessData;
}

const DAYS = [
  { id: 'sunday', label: 'ראשון' },
  { id: 'monday', label: 'שני' },
  { id: 'tuesday', label: 'שלישי' },
  { id: 'wednesday', label: 'רביעי' },
  { id: 'thursday', label: 'חמישי' },
  { id: 'friday', label: 'שישי' },
  { id: 'saturday', label: 'שבת' }
];

export function Preview({ settings, businessData }: PreviewProps) {
  const [showHours, setShowHours] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleBooking = () => {
    if (businessData?.booking_link) {
      window.open(`/book/${businessData.booking_link}`, '_blank');
    } else {
      toast.error('לא הוגדר קישור להזמנת תורים');
    }
  };

  const handleCall = () => {
    if (businessData?.contact_info?.phone) {
      window.open(`tel:${businessData.contact_info.phone.replace(/\D/g, '')}`, '_blank');
    } else {
      toast.error('לא הוגדר מספר טלפון');
    }
  };

  const handleNavigate = () => {
    if (businessData?.contact_info?.address) {
      const address = encodeURIComponent(businessData.contact_info.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    } else {
      toast.error('לא הוגדרה כתובת');
    }
  };

  const handleHours = () => {
    if (!businessData?.business_hours?.regular_hours) {
      toast.error('לא הוגדרו שעות פעילות');
      return;
    }
    setShowHours(true);
  };

  const handleSocial = (platform: 'instagram' | 'whatsapp') => {
    const url = settings.social[platform];
    if (!url) {
      toast.error(`לא הוגדר קישור ל-${platform}`);
      return;
    }

    if (platform === 'whatsapp') {
      const phone = url.replace(/\D/g, '');
      if (!phone) {
        toast.error('מספר טלפון לא תקין');
        return;
      }
      window.open(`https://wa.me/${phone}`, '_blank');
    } else {
      if (!url.startsWith('http')) {
        toast.error('קישור לא תקין');
        return;
      }
      window.open(url, '_blank');
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? settings.gallery.items.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === settings.gallery.items.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-medium">תצוגה מקדימה</h3>
      </div>
      
      <div className="p-4 bg-gray-50">
        <div className="mx-auto w-full max-w-[375px] h-[667px] bg-white rounded-[3rem] shadow-2xl overflow-hidden relative">
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-black z-10">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full" />
          </div>

          {/* Content */}
          <div className="absolute top-6 left-0 right-0 bottom-0 overflow-y-auto">
            {/* Cover Image with Gallery */}
            <div className="relative h-48">
              {settings.gallery.items[0] ? (
                <>
                  <div 
                    className="w-full h-full cursor-pointer"
                    onClick={() => settings.gallery.items.length > 0 && setShowGallery(true)}
                  >
                    {settings.gallery.items[0].type === 'video' ? (
                      <video
                        src={settings.gallery.items[0].url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img 
                        src={settings.gallery.items[0].url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  {settings.gallery.items.length > 1 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded-full text-white text-xs">
                      {settings.gallery.items.length} תמונות
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800" />
              )}
            </div>

            {/* Logo and Business Info */}
            <div className="relative -mt-16 text-center">
              {/* Logo */}
              <div className="mb-6">
                {businessData?.logo_url ? (
                  <div className="w-32 h-32 mx-auto rounded-full bg-white border-4 border-white shadow-xl overflow-hidden">
                    <img 
                      src={businessData.logo_url}
                      alt={businessData.name}
                      className="w-full h-full object-contain bg-white"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center">
                    <Scissors className="h-16 w-16 text-gray-900" />
                  </div>
                )}
              </div>

              {/* Business Name */}
              <h1 className="text-2xl font-bold px-6">{businessData?.name}</h1>
              
              {/* Address */}
              {businessData?.contact_info?.address && (
                <p className="text-gray-500 text-sm mt-1 px-6">
                  {businessData.contact_info.address}
                </p>
              )}

              {/* Login Button */}
              <div className="px-6 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAuth(true)}
                  className="w-full py-3 bg-white text-gray-900 rounded-xl font-medium shadow-xl"
                >
                  התחבר כדי לצפות בתורים שלך
                </motion.button>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-center gap-3 mt-6">
                {/* Phone */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCall}
                  className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center"
                >
                  <Phone className="h-6 w-6 text-blue-600" />
                </motion.button>

                {/* WhatsApp */}
                {settings.social.whatsapp && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSocial('whatsapp')}
                    className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center"
                  >
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </motion.button>
                )}

                {/* Waze */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleNavigate}
                  className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center"
                >
                  <MapPin className="h-6 w-6 text-indigo-600" />
                </motion.button>

                {/* Hours */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleHours}
                  className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center"
                >
                  <Clock className="h-6 w-6 text-amber-600" />
                </motion.button>

                {/* Instagram */}
                {settings.social.instagram && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSocial('instagram')}
                    className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center"
                  >
                    <Instagram className="h-6 w-6 text-pink-600" />
                  </motion.button>
                )}
              </div>

              {/* About Section */}
              <div className="p-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-2xl p-6"
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {settings.about.content}
                  </p>
                </motion.div>
              </div>

              {/* Book Appointment Section */}
              <div className="px-6 pb-6 space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBooking}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-medium border border-gray-200"
                >
                  <Calendar className="h-5 w-5" />
                  <span>הזמן תור</span>
                </motion.button>

                {/* AI Assistant Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 space-y-3">
                  <p className="text-lg font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                    גלו את העוזרת החכמה שלנו! 🤖✨
                  </p>
                  <p className="text-sm text-gray-600">
                    תיאום תורים, מחירים, ביטולים ושינויים - הכל בשיחה אחת עם הבינה המלאכותית המתקדמת שלנו
                  </p>
                  {/* Chat Preview */}
                  <div className="bg-white rounded-lg p-3 shadow-sm space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-indigo-600">עוזרת AI</p>
                        <p className="text-gray-600">היי! אשמח לעזור לך לתאם תור או לענות על כל שאלה 😊</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery Modal */}
              <AnimatePresence>
                {showGallery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-6 bg-black/90 z-50 rounded-[2rem] overflow-hidden"
                  >
                    <div className="relative w-full h-full flex items-center">
                      {/* Close Button */}
                      <button
                        onClick={() => setShowGallery(false)}
                        className="absolute top-4 right-4 p-2 text-white z-10"
                      >
                        <X className="h-6 w-6" />
                      </button>

                      {/* Navigation Buttons */}
                      {settings.gallery.items.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevImage}
                            className="absolute left-4 p-2 text-white z-10"
                          >
                            <ChevronLeft className="h-8 w-8" />
                          </button>
                          <button
                            onClick={handleNextImage}
                            className="absolute right-4 p-2 text-white z-10"
                          >
                            <ChevronRight className="h-8 w-8" />
                          </button>
                        </>
                      )}

                      {/* Current Media */}
                      <div className="w-full h-full flex items-center justify-center p-4">
                        {settings.gallery.items[currentImageIndex]?.type === 'video' ? (
                          <video
                            src={settings.gallery.items[currentImageIndex].url}
                            className="max-w-full max-h-full object-contain"
                            controls
                            autoPlay
                            playsInline
                          />
                        ) : (
                          <img
                            src={settings.gallery.items[currentImageIndex].url}
                            alt=""
                            className="max-w-full max-h-full object-contain"
                          />
                        )}
                      </div>

                      {/* Counter */}
                      {settings.gallery.items.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                          {currentImageIndex + 1} / {settings.gallery.items.length}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hours Modal */}
              <AnimatePresence>
                {showHours && businessData?.business_hours && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-6 bg-black/50 z-50 rounded-[2rem] overflow-hidden"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white w-full h-full rounded-[2rem] overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-xl">
                              <Clock className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-semibold">שעות פעילות</h2>
                          </div>
                          <button
                            onClick={() => setShowHours(false)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100%-65px)]">
                        {DAYS.map((day) => {
                          const dayHours = businessData.business_hours.regular_hours[day.id];
                          if (!dayHours) return null;

                          return (
                            <div key={day.id} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{day.label}</span>
                                {!dayHours.is_active ? (
                                  <span className="text-red-600">סגור</span>
                                ) : (
                                  <span className="text-gray-600">
                                    {dayHours.start_time} - {dayHours.end_time}
                                  </span>
                                )}
                              </div>

                              {/* Breaks */}
                              {dayHours.is_active && dayHours.breaks.length > 0 && (
                                <div className="pr-4 border-r-2 border-gray-100">
                                  {dayHours.breaks.map((breakItem, index) => (
                                    <div key={index} className="text-sm text-gray-500">
                                      הפסקה: {breakItem.start_time} - {breakItem.end_time}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Special Dates */}
                        {businessData.business_hours.special_dates
                          .filter(date => new Date(date.date) >= new Date(new Date().setHours(0,0,0,0)))
                          .length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="font-medium mb-4">ימים מיוחדים</h3>
                            <div className="space-y-4">
                              {businessData.business_hours.special_dates
                                .filter(date => new Date(date.date) >= new Date(new Date().setHours(0,0,0,0)))
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                .map((date, index) => (
                                  <div key={index} className="flex items-center justify-between">
                                    <span>{new Date(date.date).toLocaleDateString('he-IL')}</span>
                                    {date.is_closed ? (
                                      <span className="text-red-600">סגור</span>
                                    ) : (
                                      <span className="text-gray-600">
                                        {date.start_time} - {date.end_time}
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auth Modal */}
              <AnimatePresence>
                {showAuth && businessData?.id && (
                  <CustomerAuth
                    businessId={businessData.id}
                    onClose={() => setShowAuth(false)}
                    onSuccess={() => {
                      setShowAuth(false);
                      toast.success('התחברת בהצלחה!');
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Home Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-black">
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}