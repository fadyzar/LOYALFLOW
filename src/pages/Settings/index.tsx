import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  LogOut,
  Clock,
  Scissors,
  Package,
  Users,
  Building2,
  ChevronLeft,
  FileText,
  MessageSquare,
  Lock,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth/hooks';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';

const settingsLinks = [
  {
    title: 'הגדרות עסק',
    description: 'פרטי העסק, לוגו וקישור חיצוני',
    icon: Building2,
    path: '/settings/business',
    gradient: 'from-orange-500 to-amber-500',
    requiredFeature: null // זמין לכולם
  },
  {
    title: 'שעות פעילות',
    description: 'הגדרת זמני פעילות העסק והפסקות',
    icon: Clock,
    path: '/settings/hours',
    gradient: 'from-blue-500 to-indigo-500',
    requiredFeature: null // זמין לכולם
  },
  {
    title: 'שירותים',
    description: 'ניהול שירותי העסק ומחירים',
    icon: Scissors,
    path: '/settings/services',
    gradient: 'from-emerald-500 to-teal-500',
    requiredFeature: null // זמין לכולם
  },
  {
    title: 'מוצרים',
    description: 'ניהול מוצרי העסק ומלאי',
    icon: Package,
    path: '/settings/products',
    gradient: 'from-rose-500 to-pink-500',
    requiredFeature: null // זמין לכולם
  },
  {
    title: 'צוות',
    description: 'ניהול אנשי צוות והרשאות',
    icon: Users,
    path: '/settings/staff',
    gradient: 'from-purple-500 to-pink-500',
    requiredFeature: null // זמין לכולם
  },
  {
    title: 'תוכנית נאמנות',
    description: 'הגדרות נקודות ורמות נאמנות',
    icon: Award,
    path: '/settings/loyalty',
    gradient: 'from-blue-500 to-purple-500',
    requiredFeature: 'loyalty_program'
  },
  {
    title: 'בוט שירות לקוחות',
    description: 'הגדרת בוט וואטסאפ לשירות לקוחות',
    icon: MessageSquare,
    path: '/settings/whatsapp-bot',
    gradient: 'from-green-500 to-teal-500',
    requiredFeature: 'customer_service_bot'
  },
  {
    title: 'סליקה וחשבוניות',
    description: 'ניהול סליקות וחשבוניות',
    icon: FileText,
    path: '/settings/invoices',
    gradient: 'from-indigo-500 to-blue-500',
    requiredFeature: 'invoices',
    requiredRole: 'ADMIN'
  }
];

function Settings() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();

  // Use role from user_metadata (Supabase standard)
  const metaRole = user?.user_metadata?.role || null;
  console.log('metaRole from user_metadata:', metaRole);

  // פונקציה לבדיקה אם תכונה זמינה בחבילה הנוכחית
  const isFeatureAvailable = (featureCode: string | null): boolean => {
    if (!featureCode) return true;
    if (!subscription || subscriptionLoading) return false;
    if (featureCode === 'loyalty_program') return true;
    return subscription.plan.features[featureCode] === true;
  };

  // פונקציה לבדיקת הרשאות משתמש אך ורק מול metaRole
  const hasRoleAccess = (requiredRole: string | undefined): boolean => {
    if (!requiredRole) return true;
    if (!metaRole) return false;
    const result = metaRole.toLowerCase() === requiredRole.toLowerCase();
    console.log(`Checking role access: metaRole=${metaRole}, requiredRole=${requiredRole}, result=${result}`);
    return result;
  };

  // אם metaRole עדיין לא נטען, להציג הודעת טעינה
  if (!metaRole) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-lg font-semibold text-gray-600">טוען הרשאות...</span>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">הגדרות</h1>
        </div>
        
        {/* Subscription Info */}
        {subscription && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <span className="text-sm font-medium">{subscription.plan.name}</span>
          </div>
        )}
      </div>

      {/* Quick Settings Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsLinks.map((link) => {
          const isFeatureAccessible = isFeatureAvailable(link.requiredFeature);
          const isRoleAccessible = hasRoleAccess(link.requiredRole);
          const isAvailable = isFeatureAccessible && isRoleAccessible;
          
          console.log(`Link ${link.title}:`, {
            isFeatureAccessible,
            isRoleAccessible,
            isAvailable
          });
          
          return (
            <div key={link.path}>
              {isAvailable ? (
                <Link to={link.path}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-gray-900">{link.title}</h3>
                        <p className="text-sm text-gray-500">{link.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-gradient-to-br ${link.gradient} text-white`}>
                          <link.icon className="h-5 w-5" />
                        </div>
                        <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Sign Out Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">התנתק</span>
      </motion.button>
    </div>
  );
}

export default Settings;