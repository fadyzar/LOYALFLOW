import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Star, Diamond, Award, History, Clock, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { useSubscription } from '../../hooks/useSubscription';
import { useLoyaltySettings } from '../../hooks/useLoyaltySettings';
import toast from 'react-hot-toast';

type Customer = Database['public']['Tables']['customers']['Row'];

function CustomerLoyalty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled } = useLoyaltySettings();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // בדיקה אם תכונת תכנית הנאמנות זמינה
  const loyaltyEnabled = isFeatureAvailable('loyalty_program') && isLoyaltyEnabled;

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error: any) {
      console.error('Error loading customer:', error);
      toast.error('שגיאה בטעינת פרטי הלקוח');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

  if (!loyaltyEnabled) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-6">
        <div className="bg-gray-100 p-4 rounded-full">
          <Lock className="h-12 w-12 text-gray-400" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-700 mb-2">תכונה לא זמינה</h2>
          <p className="text-gray-500 mb-4">
            תכונת תוכנית הנאמנות אינה זמינה בחבילה הנוכחית שלך.
            שדרג לחבילה בינונית או VIP כדי לקבל גישה לתכונה זו.
          </p>
          <Link 
            to={`/customers/${customer.id}`}
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            חזרה לפרטי לקוח
          </Link>
        </div>
      </div>
    );
  }

  const nextLevelProgress = () => {
    const levels = {
      bronze: { next: 'silver', required: 10 },
      silver: { next: 'gold', required: 20 },
      gold: { next: 'diamond', required: 30 },
      diamond: { next: 'vip', required: 50 },
      vip: { next: null, required: null }
    };

    const current = levels[customer.loyalty_level as keyof typeof levels];
    if (!current.next) return null;

    const progress = (customer.diamonds / current.required) * 100;
    return {
      next: current.next,
      progress,
      remaining: current.required - customer.diamonds
    };
  };

  const progress = nextLevelProgress();

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/customers/${customer.id}`} className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-gray-500">{customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <nav className="flex space-x-4">
          <Link
            to={`/customers/${customer.id}`}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            פרטים
          </Link>
          <Link
            to={`/customers/${customer.id}/loyalty`}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600"
          >
            נאמנות
          </Link>
          <Link
            to={`/customers/${customer.id}/documents`}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            מסמכים
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">מצב נוכחי</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-amber-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="font-medium">נקודות</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {customer.points}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Diamond className="h-5 w-5 text-blue-500" />
                <span className="font-medium">יהלומים</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {customer.diamonds}
              </p>
            </div>
          </div>

          {progress && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">
                  בדרך ל{progress.next}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(progress.progress)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">
                נותרו {progress.remaining} יהלומים לרמה הבאה
              </p>
            </div>
          )}
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">היסטוריית ביקורים</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>ביקור אחרון</span>
              </div>
              <span className="font-medium">
                {customer.loyalty_stats.last_visit
                  ? new Date(customer.loyalty_stats.last_visit).toLocaleDateString('he-IL')
                  : 'טרם ביקר'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                <span>ביקורים רצופים</span>
              </div>
              <span className="font-medium">
                {customer.loyalty_stats.consecutive_visits}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-400" />
                <span>סה"כ ביקורים</span>
              </div>
              <span className="font-medium">
                {customer.loyalty_stats.total_visits}
              </span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-6">הישגים</h2>
            
            {customer.loyalty_stats.achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {customer.loyalty_stats.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-4 rounded-xl flex items-center gap-3"
                  >
                    <Award className="h-5 w-5 text-indigo-500" />
                    <span className="font-medium">{achievement}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                אין הישגים עדיין
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerLoyalty;