import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  Calendar, 
  Clock, 
  Diamond, 
  History, 
  Lock, 
  Star, 
  Trophy,
  Ban,
  AlertCircle
} from 'lucide-react';
import { Database } from '../../../lib/database.types';
import { useSubscription } from '../../../hooks/useSubscription';
import { useLoyaltySettings } from '../../../hooks/useLoyaltySettings';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
  onBlock: (customer: Customer) => void;
}

export function CustomerDetails({ customer, onClose, onBlock }: CustomerDetailsProps) {
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled } = useLoyaltySettings();
  
  // בדיקה אם תכונת הנאמנות זמינה במנוי וגם מופעלת בהגדרות
  const loyaltyEnabled = isFeatureAvailable('loyalty_program') && isLoyaltyEnabled;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Lock className="h-5 w-5" />
          </button>
        </div>

        {/* Loyalty Progress */}
        {loyaltyEnabled && progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>בדרך ל{progress.next}</span>
              <span>{Math.round(progress.progress)}%</span>
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

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Stats */}
        {loyaltyEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="font-medium">נקודות</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{customer.points}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Diamond className="h-5 w-5 text-blue-500" />
                <span className="font-medium">יהלומים</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{customer.diamonds}</p>
            </div>
          </div>
        )}

        {/* Visit History */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            היסטוריית ביקורים
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>ביקור אחרון</span>
              </div>
              <span>
                {customer.loyalty_stats.last_visit
                  ? new Date(customer.loyalty_stats.last_visit).toLocaleDateString('he-IL')
                  : 'טרם ביקר'}
              </span>
            </div>
            {loyaltyEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>ביקורים רצופים</span>
                  </div>
                  <span>{customer.loyalty_stats.consecutive_visits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-gray-400" />
                    <span>סה"כ ביקורים</span>
                  </div>
                  <span>{customer.loyalty_stats.total_visits}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Achievements */}
        {loyaltyEnabled && (
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              הישגים
            </h3>
            {customer.loyalty_stats.achievements.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {customer.loyalty_stats.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 p-3 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Award className="h-4 w-4 text-indigo-500" />
                    <span>{achievement}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                אין הישגים עדיין
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-6">
          <button
            onClick={() => onBlock(customer)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
          >
            <Ban className="h-5 w-5" />
            חסום לקוח
          </button>
          {customer.metadata?.blocked && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>הלקוח חסום</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}