import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppointmentDetails } from '../../components/appointments/DayView/components/AppointmentDetails';
import {
  ArrowRight,
  Edit2,
  Ban,
  Star,
  Diamond,
  History,
  Award,
  Lock,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Clock,
  FileText,
  MessageSquare,
  Tag,
  User,
  Scissors,
  Package,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  Repeat,
  Edit,
  Trash2,
  Plus,
  ShoppingBag,
  Trophy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { CustomerForm } from './components/CustomerForm';
import { useSubscription } from '../../hooks/useSubscription';
import { useLoyaltySettings } from '../../hooks/useLoyaltySettings';
import toast from 'react-hot-toast';
import { format, parseISO, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import { RegularAppointmentModal } from './components/RegularAppointmentModal';

interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  points: number;
  diamonds: number;
  loyalty_level: 'silver' | 'gold' | 'diamond' | 'vip';
  loyalty_stats: {
    total_visits: number;
    total_spent: number;
    last_visit: string;
    achievements: string[];
    consecutive_visits: number;
  };
  metadata: {
    address?: string;
    birth_date?: string;
    city?: string;
    tags?: string[];
    blocked?: boolean;
  } | null;
  last_login?: string;
  last_visit?: string;
  total_purchases: number;
  total_spent: number;
  average_purchase: number;
  visit_frequency: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  price: number;
}

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  services: Service | Service[];
  users: {
    name: string;
  };
}

type TabType = 'loyalty' | 'documents' | 'purchases' | 'visits';

interface LoyaltyBenefits {
  products_discount: number;
  services_discount: number;
  birthday_appointment: boolean;
  free_appointment_every: number | null;
}

interface LoyaltyLevel {
  benefits: LoyaltyBenefits;
  diamonds_required: number;
}

interface BusinessSettings {
  loyalty: {
    levels: Record<string, LoyaltyLevel>;
    points: {
      per_visit: number;
      per_amount: number;
      per_referral: number;
      expiration_days: number;
    };
    enabled: boolean;
    diamonds: {
      per_amount: number;
      per_consecutive_visits: number;
      consecutive_visits_required: number;
    };
  };
}

const getLoyaltyLabel = (level: string) => {
  switch (level) {
    case 'vip':
      return 'VIP';
    case 'diamond':
      return 'יהלום';
    case 'gold':
      return 'זהב';
    default:
      return 'כסף';
  }
};

const formatBenefits = (benefits: LoyaltyBenefits) => {
  const parts = [];
  if (benefits.services_discount) {
    parts.push(`הנחה של ${benefits.services_discount}% על שירותים`);
  }
  if (benefits.products_discount) {
    parts.push(`הנחה של ${benefits.products_discount}% על מוצרים`);
  }
  if (benefits.free_appointment_every) {
    parts.push(`תור חינם כל ${benefits.free_appointment_every} תורים`);
  }
  if (benefits.birthday_appointment) {
    parts.push('הטבת יום הולדת');
  }
  return parts.join(', ');
};

function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled } = useLoyaltySettings();
  const [customer, setCustomer] = useState<Customer | null>(null);
  // const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [completedAppointments, setCompletedAppointments] = useState(0);
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'appointments' | 'loyalty' | 'documents'>('info');
  const [showRegularAppointmentModal, setShowRegularAppointmentModal] = useState(false);
  const [lastAppointment, setLastAppointment] = useState<any>(null);
  const [yearlyVisitCount, setYearlyVisitCount] = useState<number>(0);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  // בדיקה אם תכונת תכנית הנאמנות זמינה במנוי וגם מופעלת בהגדרות
  const loyaltyEnabled = isFeatureAvailable('loyalty_program') && isLoyaltyEnabled;

  useEffect(() => {
    if (id === 'new') {
      navigate('/customers', { replace: true });
    }
  }, [id]);

  if (id === 'new') return null;
  useEffect(() => {
    loadCustomer();
    loadBusinessSettings();
  }, [id]);

  const loadCustomer = async () => {
    if (!id || id === 'new') {

      return;
    }



    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);

      // Load all appointments
      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
  id,
  start_time,
  end_time,
  status,
  business_id,
  customer_id,
  service_id,
  staff_id,
  metadata,
  customers (
    name,
    phone
  ),
  services (
    name_he
  ),
  users (
    name
  )
`)

        .eq('customer_id', id)
        .order('start_time', { ascending: false });

      if (!appointmentsError) {
  const recent = (allAppointments || [])
    .filter((a) => a.status !== 'canceled')
    .slice(0, 3);

  setRecentAppointments(recent);
}

      // Update customer with real statistics
      const completedAppointments = allAppointments?.filter((apt: Appointment) => apt.status === 'completed') || [];
      const totalSpent = completedAppointments.reduce((sum: number, app: Appointment) => {
        // Check if services is an array or a single object
        const services = Array.isArray(app.services) ? app.services : [app.services];
        const servicePrices = services.reduce((total: number, service: Service | null) => {
          if (!service) return total;
          return total + (service.price || 0);
        }, 0);
        return sum + servicePrices;
      }, 0);
      const averagePurchase = completedAppointments.length > 0 ? totalSpent / completedAppointments.length : 0;

      // Calculate visit frequency
      let visitFrequency: 'high' | 'medium' | 'low' = 'low';
      if (completedAppointments.length >= 12) {
        visitFrequency = 'high';
      } else if (completedAppointments.length >= 6) {
        visitFrequency = 'medium';
      }

      // Update customer with real statistics
      const updatedCustomer = {
        ...data,
        business_id: data.business_id,
        total_purchases: completedAppointments.length,
        total_spent: totalSpent,
        average_purchase: averagePurchase,
        visit_frequency: visitFrequency
      };
      setCustomer(updatedCustomer);
      setCompletedAppointments(completedAppointments.length);

      fetchLastAppointment(data.id);
    } catch (error: any) {
      console.error('Error loading customer:', error);
      toast.error('שגיאה בטעינת פרטי הלקוח');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessSettings = async () => {
    try {
      if (!customer?.business_id) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', customer.business_id)
        .single(); // עכשיו זה יחזיר רק את העסק של הלקוח הזה

      if (error) throw error;
      setBusinessSettings(data.settings);
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const fetchLastAppointment = async (customerId: string) => {
    try {
      const now = new Date();

      // Get the last completed appointment
      const { data: lastAppointmentData, error: lastAppointmentError } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          services (
            name_he
          ),
          status
        `)
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastAppointmentError && lastAppointmentData) {
        setLastAppointment(lastAppointmentData);
      }

      // Calculate number of completed appointments in the last year
      const yearAgo = subMonths(now, 12);

      const { count, error: countError } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .gte('start_time', yearAgo.toISOString());

      if (!countError && count !== null) {
        setYearlyVisitCount(count);
      }
    } catch (error) {
      console.error('Error fetching appointment data:', error);
    }
  };

  const handleSubmit = async (data: Partial<Customer>) => {
    if (!customer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', customer.id);

      if (error) throw error;
      toast.success('הלקוח עודכן בהצלחה');
      setShowEditForm(false);
      loadCustomer();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.message || 'שגיאה בעדכון הלקוח');
    }
  };

  const handleBlock = async () => {
    if (!customer) return;
     console.log('clicked');

    try {
      const isBlocked = customer.metadata?.blocked || false;
      const newMetadata = {
        ...customer.metadata,
        blocked: !isBlocked,
        blocked_at: isBlocked ? null : new Date().toISOString()
      };

      const { error } = await supabase
        .from('customers')
        .update({
          metadata: newMetadata
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast.success(
        isBlocked
          ? 'הלקוח שוחרר בהצלחה'
          : 'הלקוח נחסם בהצלחה'
      );
      if (typeof window !== 'undefined') {
  window.dispatchEvent(new Event('refresh-customers'));
}


      loadCustomer();
    } catch (error) {
      console.error('Error blocking customer:', error);
      toast.error('שגיאה בחסימת הלקוח');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">ממתין לאישור</span>;
      case 'confirmed':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">מאושר</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">הושלם</span>;
      case 'canceled':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">בוטל</span>;
      case 'no_show':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">לא הגיע</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0 ₪';
    return value.toLocaleString('he-IL') + ' ₪';
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (id === 'new') {
    return null; // או מודאל יצירת לקוח, או ריק
  }

  if (!customer) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">לא נמצא לקוח</p>
        <Link
          to="/customers"
          className="text-indigo-600 hover:text-indigo-700"
        >
          חזרה לרשימת הלקוחות
        </Link>
      </div>
    );
  }

  const nextLevelProgress = () => {
    if (!customer || !businessSettings?.loyalty?.levels) return null;

    const levels = {
      silver: { next: 'gold', required: 20 },
      gold: { next: 'diamond', required: 30 },
      diamond: { next: 'vip', required: 50 },
      vip: { next: null, required: null }
    };

    const current = levels[customer.loyalty_level as keyof typeof levels];
    if (!current.next) return null;

    const progress = (customer.diamonds / current.required) * 100;
    const nextLevelBenefits = businessSettings.loyalty.levels[current.next as keyof typeof businessSettings.loyalty.levels]?.benefits;

    return {
      next: current.next,
      nextLabel: getLoyaltyLabel(current.next),
      progress,
      remaining: current.required - customer.diamonds,
      benefits: nextLevelBenefits ? formatBenefits(nextLevelBenefits) : ''
    };
  };

  const progress = nextLevelProgress();

  const getCurrentLevelBenefits = () => {
    const levels = {
      silver: 'אין הטבות מיוחדות',
      gold: 'הנחה של 5% על שירותים ומוצרים',
      diamond: 'הנחה של 10% על שירותים ומוצרים, תור חינם כל 10 תורים',
      vip: 'הנחה של 20% על שירותים ומוצרים, תור חינם כל 5 תורים, הטבת יום הולדת, שירות VIP'
    };

    return levels[customer.loyalty_level as keyof typeof levels];
  };

  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case 'vip':
        return 'bg-purple-100 text-purple-800';
      case 'diamond':
        return 'bg-blue-100 text-blue-800';
      case 'gold':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderLoyaltyStats = () => {
    if (!customer) return null;

    const nextLevel = nextLevelProgress();
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">יהלומים</h3>
            <p className="text-2xl font-bold">{customer?.diamonds}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">רמת נאמנות</h3>
            <p className="text-2xl font-bold">{customer?.loyalty_level}</p>
          </div>
        </div>

        {nextLevel && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">התקדמות לרמה הבאה</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{customer?.diamonds} יהלומים</span>
                <span>{nextLevel.remaining} יהלומים נדרשים</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${Math.min(nextLevel.progress, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                יתרונות ברמת {nextLevel.next}: {nextLevel.benefits}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to="/customers" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xl font-bold text-indigo-600">
                  {customer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                  </a>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{customer.email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowEditForm(true)}
              className="p-2 bg-indigo-50 rounded-full text-indigo-600 hover:bg-indigo-100"
            >
              <Edit className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBlock}
              className={`p-2 rounded-full ${customer.metadata?.blocked
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Ban className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          {customer.metadata?.blocked && (
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>לקוח חסום</span>
            </div>
          )}

          {loyaltyEnabled && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${customer.loyalty_level === 'vip'
                ? 'bg-purple-100 text-purple-800'
                : customer.loyalty_level === 'diamond'
                  ? 'bg-blue-100 text-blue-800'
                  : customer.loyalty_level === 'gold'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
              <Award className="h-4 w-4" />
              <span>
                {customer.loyalty_level === 'vip'
                  ? 'VIP'
                  : customer.loyalty_level === 'diamond'
                    ? 'יהלום'
                    : customer.loyalty_level === 'gold'
                      ? 'זהב'
                      : 'כסף'}
              </span>
            </div>
          )}

          {customer.metadata?.tags && Array.isArray(customer.metadata.tags) && customer.metadata.tags.map((tag: string, index: number) => (
            <div key={index} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
              <Tag className="h-4 w-4" />
              <span>{tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'info'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            פרטים
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'appointments'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            תורים
          </button>
          {loyaltyEnabled && (
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'loyalty'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              נאמנות
            </button>
          )}
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === 'documents'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            מסמכים
          </button>
        </div>

        {/* Content based on active tab */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  פרטים אישיים
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">שם מלא</span>
                    </div>
                    <p className="text-lg font-medium">{customer.name}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">טלפון</span>
                    </div>
                    <p className="text-lg font-medium">{customer.phone}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">אימייל</span>
                    </div>
                    <p className="text-lg font-medium">{customer.email || '-'}</p>
                  </div>
                  {customer.metadata?.birth_date && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        <span className="text-sm font-medium">תאריך לידה</span>
                      </div>
                      <p className="text-lg font-medium">
                        {new Date(customer.metadata.birth_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  )}
                  {customer.metadata?.city && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        <span className="text-sm font-medium">עיר</span>
                      </div>
                      <p className="text-lg font-medium">{customer.metadata.city}</p>
                    </div>
                  )}
                  {customer.metadata?.tags && customer.metadata.tags.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        <span className="text-sm font-medium">תגיות</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {customer.metadata.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer History */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  היסטוריית לקוח
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">תאריך הצטרפות</span>
                    </div>
                    <p className="text-lg font-medium">
                      {new Date(customer.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">ביקור אחרון</span>
                    </div>
                    <p className="text-lg font-medium">
                      {customer.last_visit
                        ? new Date(customer.last_visit).toLocaleDateString('he-IL')
                        : 'טרם ביקר'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">סה"כ רכישות</span>
                    </div>
                    <p className="text-lg font-medium">{customer.total_purchases}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">סה"כ הוצאות</span>
                    </div>
                    <p className="text-lg font-medium">
                      {formatCurrency(customer?.total_spent)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">ממוצע ביקור</span>
                    </div>
                    <p className="text-lg font-medium">
                      {formatCurrency(customer?.average_purchase)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">תדירות ביקורים</span>
                    </div>
                    <p className="text-lg font-medium">
                      {customer.visit_frequency === 'high'
                        ? 'גבוהה'
                        : customer.visit_frequency === 'medium'
                          ? 'בינונית'
                          : 'נמוכה'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  היסטוריית תורים
                </h2>
                <div className="text-sm text-gray-500">
                  סה"כ: {completedAppointments} תורים
                </div>
              </div>

              {recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {recentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      onClick={() => setSelectedAppointment(appointment)}
                      className="cursor-pointer bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-lg">{appointment.services.name_he}</div>
                          <div className="text-sm text-gray-500 mt-1">עם {appointment.users.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatDate(appointment.start_time)}</div>
                          <div className="text-sm text-gray-500">{formatTime(appointment.start_time)}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>
                  ))}

                  <div className="text-center mt-4">
                    <Link
                      to={`/appointments?customer=${customer.id}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      עבור ליומן
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">אין תורים קודמים</p>
                </div>
              )}

              {/* 👇 הצגת המודאל */}
              {selectedAppointment && (
                <AppointmentDetails
                  appointment={selectedAppointment}
                  onClose={() => setSelectedAppointment(null)}
                  onUpdate={() => {
                    loadCustomer(); // מרענן את כל הנתונים אחרי שינוי בתור
                  }}
                />
              )}
            </div>
          )}


          {activeTab === 'loyalty' && loyaltyEnabled && (
            <div className="space-y-6">
              {/* Loyalty Level */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  רמת נאמנות
                </h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${customer.loyalty_level === 'vip'
                      ? 'bg-purple-100'
                      : customer.loyalty_level === 'diamond'
                        ? 'bg-blue-100'
                        : customer.loyalty_level === 'gold'
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                    }`}>
                    <Award
                      className={`h-8 w-8 ${customer.loyalty_level === 'vip'
                          ? 'text-purple-600'
                          : customer.loyalty_level === 'diamond'
                            ? 'text-blue-600'
                            : customer.loyalty_level === 'gold'
                              ? 'text-amber-600'
                              : 'text-gray-600'
                        }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {getLoyaltyLabel(customer.loyalty_level)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {customer.loyalty_level === 'vip'
                        ? 'רמת נאמנות הגבוהה ביותר'
                        : customer.loyalty_level === 'diamond'
                          ? 'רמת נאמנות גבוהה'
                          : customer.loyalty_level === 'gold'
                            ? 'רמת נאמנות בינונית-גבוהה'
                            : 'רמת נאמנות בסיסית'}
                    </p>
                  </div>
                </div>

                {businessSettings?.loyalty?.levels[customer.loyalty_level] && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">הטבות נוכחיות:</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {formatBenefits(businessSettings.loyalty.levels[customer.loyalty_level].benefits)}
                    </p>
                  </div>
                )}

                {nextLevelProgress() && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">המעמד הבא שלך:</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Award className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{nextLevelProgress()?.nextLabel}</p>
                        <p className="text-sm text-gray-600">{nextLevelProgress()?.benefits}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{customer.diamonds} יהלומים</span>
                        <span>נדרשים עוד {nextLevelProgress()?.remaining} יהלומים</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${Math.min((nextLevelProgress()?.progress || 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Loyalty Stats */}
              {renderLoyaltyStats()}

              {/* Visit History */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                  היסטוריית ביקורים
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">ביקור אחרון</span>
                    </div>
                    <p className="text-lg font-medium">
                      {customer.loyalty_stats.last_visit
                        ? new Date(customer.loyalty_stats.last_visit).toLocaleDateString('he-IL')
                        : 'טרם ביקר'}
                    </p>
                  </div>
                  {customer.loyalty_stats.consecutive_visits > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        <span className="text-sm font-medium">ביקורים רצופים</span>
                      </div>
                      <p className="text-lg font-medium">{customer.loyalty_stats.consecutive_visits}</p>
                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <span className="text-sm font-medium">סה"כ ביקורים</span>
                    </div>
                    <p className="text-lg font-medium">{customer.loyalty_stats.total_visits}</p>
                  </div>
                  {customer.loyalty_stats.achievements.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-4 w-4 text-gray-400" aria-hidden="true" />
                        <span className="text-sm font-medium">הישגים</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {customer.loyalty_stats.achievements.map((achievement) => (
                          <span
                            key={achievement}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                          >
                            {achievement}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                מסמכים וחשבוניות
              </h2>

              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">אין מסמכים זמינים</p>
                  <button
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    onClick={() => navigate('/invoices/new', { state: { customerId: customer.id } })}
                  >
                    צור חשבונית חדשה
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-20 right-4 flex flex-col gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowRegularAppointmentModal(true)}
          className="p-3 bg-indigo-600 text-white rounded-full shadow-lg"
        >
          <Repeat className="h-6 w-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/appointments/new', { state: { customerId: customer.id } })}
          className="p-3 bg-indigo-600 text-white rounded-full shadow-lg"
        >
          <Calendar className="h-6 w-6" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.open(`tel:${customer.phone}`, '_blank')}
          className="p-3 bg-green-600 text-white rounded-full shadow-lg"
        >
          <Phone className="h-6 w-6" />
        </motion.button>
        {customer.email && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.open(`mailto:${customer.email}`, '_blank')}
            className="p-3 bg-blue-600 text-white rounded-full shadow-lg"
          >
            <Mail className="h-6 w-6" />
          </motion.button>
        )}
      </div>

      {/* Edit Form Modal */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <CustomerForm
              customer={customer}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowEditForm(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regular Appointment Modal */}
      {showRegularAppointmentModal && (
        <RegularAppointmentModal
          onClose={() => setShowRegularAppointmentModal(false)}
          customer={customer}
        />
      )}
    </div>
  );
}

export default CustomerDetails;