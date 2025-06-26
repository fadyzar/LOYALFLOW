import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Calendar, Award, Diamond, Star, History, Clock, User, MapPin } from 'lucide-react';
import { Database } from '../../../lib/database.types';
import { useSubscription } from '../../../hooks/useSubscription';
import { useLoyaltySettings } from '../../../hooks/useLoyaltySettings';
import { supabase } from '../../../lib/supabase';
import { format, parseISO, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
}

export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled } = useLoyaltySettings();
  const [lastAppointment, setLastAppointment] = useState<any>(null);
  const [yearlyVisitCount, setYearlyVisitCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  
  const loyaltyEnabled = isFeatureAvailable('loyalty_program') && isLoyaltyEnabled;

  useEffect(() => {
    fetchLastAppointment();
  }, [customer.id]);

  const fetchLastAppointment = async () => {
    try {
      setLoading(true);
      
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
        .eq('customer_id', customer.id)
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
        .eq('customer_id', customer.id)
        .eq('status', 'completed')
        .gte('start_time', yearAgo.toISOString());

      if (!countError && count !== null) {
        setYearlyVisitCount(count);
      }
    } catch (error) {
      console.error('Error fetching appointment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLoyaltyColor = (level: string) => {
    switch (level) {
      case 'vip':
        return 'bg-purple-100 text-purple-800';
      case 'diamond':
        return 'bg-blue-100 text-blue-800';
      case 'gold':
        return 'bg-amber-100 text-amber-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  const getLoyaltyLabel = (level: string) => {
    switch (level) {
      case 'vip':
        return 'VIP';
      case 'diamond':
        return 'יהלום';
      case 'gold':
        return 'זהב';
      case 'silver':
        return 'כסף';
      default:
        return 'ברונזה';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // If the number starts with 0, add +972 instead
    if (digitsOnly.startsWith('0')) {
      return '+972' + digitsOnly.substring(1);
    }
    
    return phone;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all"
      onClick={() => onEdit(customer)}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-semibold text-indigo-600">
            {getInitials(customer.name)}
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-1">{customer.name}</h3>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <a 
                    href={`tel:${formatPhoneNumber(customer.phone)}`}
                    onClick={(e) => e.stopPropagation()} 
                    className="text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <a 
                      href={`mailto:${customer.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm truncate"
                    >
                      {customer.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Loyalty Badge */}
            {loyaltyEnabled && (
              <div className="flex flex-col items-end gap-1">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLoyaltyColor(customer.loyalty_level)}`}>
                  {getLoyaltyLabel(customer.loyalty_level)}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{customer.points}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Diamond className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{customer.diamonds}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visit History */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {lastAppointment ? (
                    <span>
                      {format(parseISO(lastAppointment.start_time), 'dd/MM/yy', { locale: he })}
                      {' - '}
                      {lastAppointment.services.name_he}
                    </span>
                  ) : (
                    customer.loyalty_stats.last_visit ? (
                      <span>
                        {new Date(customer.loyalty_stats.last_visit).toLocaleDateString('he-IL')}
                      </span>
                    ) : (
                      <span className="text-gray-400">טרם ביקר</span>
                    )
                  )}
                </span>
              </div>
              {loyaltyEnabled && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  <span>{customer.loyalty_stats.total_visits} ביקורים</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metadata or Tags */}
      {customer.metadata?.blocked && (
  <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-600 p-2 rounded-lg text-xs">
    <User className="h-3 w-3" />
    <span>לקוח חסום</span>
  </div>
)}

      
      {customer.metadata?.notes && (
        <div className="mt-3 text-sm text-gray-500 italic">
          "{customer.metadata.notes}"
        </div>
      )}
    </motion.div>
  );
}