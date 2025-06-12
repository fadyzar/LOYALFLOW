import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Tag, Clock } from 'lucide-react';
import { calculateLoyaltyDiscounts } from '../../../../lib/loyalty';
import { supabase } from '../../../../lib/supabase';

interface ServicePromotion {
  type: 'percentage' | 'fixed';
  value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

interface Service {
  id: string;
  name: string;
  name_he: string;
  price: number;
  duration: number | string;
  business_id: string;
  promotion?: ServicePromotion;
  image_url?: string;
  description?: string;
}

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (serviceId: string) => void;
  customerId?: string;
  businessSettings?: any;
}

interface LoyaltyBenefits {
  services_discount: number;
  products_discount: number;
  birthday_appointment: boolean;
  free_appointment_every: number | null;
}

export function ServiceCard({ service, onEdit, onDelete, customerId, businessSettings }: ServiceCardProps) {
  const isPromotionValid = (promotion: Service['promotion']) => {
    if (!promotion?.is_active) return false;
    
    const now = new Date().getTime();
    const startDate = promotion.start_date ? new Date(promotion.start_date).getTime() : null;
    const endDate = promotion.end_date ? new Date(promotion.end_date).getTime() : null;
    
    // Check if promotion has expired
    if (endDate && now > endDate) return false;
    // Check if promotion hasn't started yet
    if (startDate && now < startDate) return false;
    
    return true;
  };

  const hasPromotion = service.promotion && isPromotionValid(service.promotion);
  const originalPrice = service.price.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let finalPrice = service.price;
  
  if (hasPromotion && service.promotion) {
    if (service.promotion.discount_type === 'percentage') {
      finalPrice = finalPrice * (1 - service.promotion.discount_value / 100);
    } else {
      finalPrice = finalPrice - (service.promotion?.discount_value || 0);
    }
  }

  const formattedPrice = finalPrice.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calculateFinalPrice = async (customerId?: string) => {
    let finalPrice = service.price;
    
    // Apply promotion if exists and is active
    if (service.promotion?.is_active) {
      if (service.promotion.type === 'percentage') {
        finalPrice = finalPrice * (1 - service.promotion.value / 100);
      } else {
        finalPrice = finalPrice - service.promotion.value;
      }
    }

    // Apply loyalty discount if customer is provided
    if (customerId && businessSettings?.loyalty?.enabled) {
      const { data: customer } = await supabase
        .from('customers')
        .select('loyalty_level')
        .eq('id', customerId)
        .single();

      if (customer?.loyalty_level && businessSettings.loyalty.levels[customer.loyalty_level]) {
        const benefits = businessSettings.loyalty.levels[customer.loyalty_level].benefits;
        if (benefits.services_discount > 0) {
          finalPrice = finalPrice * (1 - benefits.services_discount / 100);
    }
  }
    }

    return finalPrice.toFixed(2);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {service.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={service.image_url}
            alt={service.name_he}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{service.name_he}</h3>
            <p className="text-sm text-gray-500">{service.name}</p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(service)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Edit2 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(service.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {service.description && (
          <p className="mt-2 text-sm text-gray-600">{service.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{typeof service.duration === 'string' ? service.duration.replace('minutes', 'דקות') : `${service.duration} דקות`}</span>
            </div>
            
            {hasPromotion && service.promotion && (
              <div className="flex items-center gap-1 text-green-600">
                <Tag className="h-4 w-4" />
                <span>
                  {service.promotion.discount_type === 'percentage'
                    ? `${service.promotion.discount_value}% הנחה`
                    : `${service.promotion.discount_value}₪ הנחה`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasPromotion && (
              <span className="text-gray-400 line-through">₪{originalPrice}</span>
            )}
            <div className="text-lg font-bold">
              {formattedPrice} ₪
            </div>
          </div>
        </div>

        {hasPromotion && service.promotion?.start_date && service.promotion?.end_date && (
          <div className="mt-2 text-xs text-gray-500">
            בתוקף מ-{new Date(service.promotion.start_date).toLocaleDateString('he-IL')} עד {new Date(service.promotion.end_date).toLocaleDateString('he-IL')}
          </div>
        )}
      </div>
    </motion.div>
  );
}