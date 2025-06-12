import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { Calendar, Phone, MapPin, Clock, Instagram, X, Scissors, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, parseISO, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { CustomerAuth } from '../../components/auth/CustomerAuth';
import { BookingWizard } from '../../components/booking/BookingWizard';
import { AppointmentDetails } from '../../components/booking/AppointmentDetails';
import { CustomerAIChat } from '../../components/booking/CustomerAIChat';
import toast from 'react-hot-toast';

export default function ExternalPage() {
  const { businessLink } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; staffId: string } | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (businessLink) {
      loadBusinessData();
    }
  }, [businessLink]);

  useEffect(() => {
    if (businessData?.id) {
      checkAuth();
    }
  }, [businessData?.id]);

  useEffect(() => {
    if (customerId && businessData?.id) {
      loadAppointments();
    }
  }, [customerId, businessData?.id]);

  const loadBusinessData = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
          *,
          business_hours (
            regular_hours,
            special_dates
          )
        `)
        .eq('booking_link', businessLink)
        .single();

      if (businessError) throw businessError;
      if (!business) throw new Error('העסק לא נמצא');

      console.log('Business data loaded:', business.id);
      setBusinessData(business);
      setSettings(business.external_page_settings);
    } catch (error: any) {
      console.error('Error loading business data:', error);
      setError(error.message || 'שגיאה בטעינת נתוני העסק');
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const customerPhone = localStorage.getItem('customerPhone');
      if (!customerPhone) {
        setIsAuthenticated(false);
        setCustomerId(null);
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('business_id', businessData.id)
        .eq('phone', customerPhone)
        .single();

      if (customerError || !customer) {
        localStorage.removeItem('customerPhone');
        setIsAuthenticated(false);
        setCustomerId(null);
        return;
      }

      console.log('Customer authenticated:', customer.id);
      setIsAuthenticated(true);
      setCustomerId(customer.id);
      setCustomerName(customer.name);
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      setCustomerId(null);
    }
  };

  const loadAppointments = async () => {
    if (!customerId || !businessData?.id) return;

    try {
      setLoadingAppointments(true);
      
      const twoWeeksFromNow = addDays(new Date(), 14);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          services (
            name_he
          ),
          users (
            name
          ),
          status
        `)
        .eq('customer_id', customerId)
        .eq('business_id', businessData.id)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', twoWeeksFromNow.toISOString())
        .in('status', ['booked', 'confirmed'])
        .order('start_time');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('שגיאה בטעינת התורים');
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleBookingSuccess = async (appointmentId: string) => {
    try {
      await loadAppointments();
      setShowBooking(false);
      toast.success('התור נקבע בהצלחה!');
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const customerPhone = localStorage.getItem('customerPhone');
      if (!customerPhone) {
        throw new Error('לא נמצא מספר טלפון של הלקוח');
      }

      const { error } = await supabase.rpc('cancel_appointment', {
        appointment_id: appointmentId,
        customer_phone: customerPhone,
        reason: 'ביטול ביוזמת הלקוח'
      });

      if (error) throw error;

      await loadAppointments();
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  };

  const handleBooking = () => {
    setShowBooking(true);
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

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    setIsAuthenticated(false);
    setCustomerId(null);
    setAppointments([]);
    toast.success('התנתקת בהצלחה');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !businessData || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-500 text-center">{error || 'העסק לא נמצא'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="relative -mt-16 text-center pb-40">
        <div className="mb-6">
          {businessData.logo_url ? (
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

        <h1 className="text-2xl font-bold px-6">{businessData.name}</h1>
        
        {businessData.contact_info?.address && (
          <p className="text-gray-500 text-sm mt-1 px-6">
            {businessData.contact_info.address}
          </p>
        )}

        {isAuthenticated && (
          <div className="flex justify-end px-6 mt-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              התנתק
            </motion.button>
          </div>
        )}

        {isAuthenticated ? (
          <div className="px-6 mt-4">
            <p className="text-lg font-medium text-gray-900">
              היי {customerName}, התגעגענו!
            </p>
          </div>
        ) : (
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
        )}

        <div className="px-6 mt-6">
          {loadingAppointments ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : appointments.length > 0 ? (
            <>
              <h3 className="font-medium text-right">התורים הבאים שלך</h3>
              <div className="space-y-3">
                {appointments.map(apt => (
                  <motion.div
                    key={apt.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedAppointment(apt)}
                    className="bg-white p-4 rounded-xl shadow-sm cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{apt.services.name_he}</p>
                        <p className="text-sm text-gray-500">עם {apt.users.name}</p>
                      </div>
                      <div className="text-sm">
                        {format(parseISO(apt.start_time), 'EEEE, d בMMMM', { locale: he })}
                        <br />
                        {format(parseISO(apt.start_time), 'HH:mm')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 mb-4">
              אין לך תורים קרובים
            </p>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBooking}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium"
          >
            <Calendar className="h-5 w-5" />
            <span>קבע תור חדש</span>
          </motion.button>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCall}
            className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center"
          >
            <Phone className="h-6 w-6 text-blue-600" />
          </motion.button>

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

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNavigate}
            className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center"
          >
            <MapPin className="h-6 w-6 text-indigo-600" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowHours(true)}
            className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center"
          >
            <Clock className="h-6 w-6 text-amber-600" />
          </motion.button>

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
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-white via-white to-transparent pb-safe">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 shadow-lg border border-white/50"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                  היי! אני לוליטה 👋
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  אשמח לעזור לך לקבוע תור, לבדוק זמינות, או לענות על כל שאלה 😊
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('יש להתחבר כדי להשתמש בצ\'אט');
                  setShowAuth(true);
                  return;
                }
                setShowChat(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors mt-3"
            >
              <MessageCircle className="h-5 w-5" />
              <span>התחל צ'אט</span>
            </motion.button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center"
          >
            <div className="relative w-full h-full flex items-center">
              <button
                onClick={() => setShowGallery(false)}
                className="absolute top-4 right-4 p-2 text-white z-10"
              >
                <X className="h-6 w-6" />
              </button>

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

              {settings.gallery.items.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                  {currentImageIndex + 1} / {settings.gallery.items.length}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {showHours && businessData?.business_hours && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowHours(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
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

              <div className="p-4 space-y-4">
                {Object.entries(businessData.business_hours.regular_hours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{
                        day === 'sunday' ? 'ראשון' :
                        day === 'monday' ? 'שני' :
                        day === 'tuesday' ? 'שלישי' :
                        day === 'wednesday' ? 'רביעי' :
                        day === 'thursday' ? 'חמישי' :
                        day === 'friday' ? 'שישי' :
                        'שבת'
                      }</span>
                      {!hours.is_active ? (
                        <span className="text-red-600">סגור</span>
                      ) : (
                        <span className="text-gray-600">
                          {hours.start_time} - {hours.end_time}
                        </span>
                      )}
                    </div>

                    {hours.is_active && hours.breaks.length > 0 && (
                      <div className="pr-4 border-r-2 border-gray-100">
                        {hours.breaks.map((breakItem: any, index: number) => (
                          <div key={index} className="text-sm text-gray-500">
                            הפסקה: {breakItem.start_time} - {breakItem.end_time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {businessData.business_hours.special_dates
                  .filter((date: any) => new Date(date.date) >= new Date(new Date().setHours(0,0,0,0)))
                  .length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-medium mb-4">ימים מיוחדים</h3>
                    <div className="space-y-4">
                      {businessData.business_hours.special_dates
                        .filter((date: any) => new Date(date.date) >= new Date(new Date().setHours(0,0,0,0)))
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((date: any, index: number) => (
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

        {showAuth && businessData?.id && (
          <CustomerAuth
            businessId={businessData.id}
            onClose={() => setShowAuth(false)}
            onSuccess={() => {
              setShowAuth(false);
              toast.success('התחברת בהצלחה!');
              checkAuth();
            }}
          />
        )}

        {showBooking && businessData?.id && (
          <BookingWizard
            businessId={businessData.id}
            onClose={() => setShowBooking(false)}
            onSuccess={handleBookingSuccess}
          />
        )}

        {selectedAppointment && (
          <AppointmentDetails
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onCancel={handleCancelAppointment}
          />
        )}

        {showChat && businessData?.id && (
          <CustomerAIChat
            businessId={businessData.id}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}