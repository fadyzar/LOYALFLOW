import React from 'react';
import { motion } from 'framer-motion';
import { Package, Scissors, Tag } from 'lucide-react';

interface ItemSelectorProps {
  type: 'service' | 'product';
  items: Array<{
    id: string;
    name_he: string;
    price: number;
    stock_quantity?: number;
    promotion?: {
      is_active: boolean;
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      start_date?: string;
      end_date?: string;
    };
  }>;
  onSelect: (item: any) => void;
  onClose: () => void;
}

export function ItemSelector({ type, items, onSelect, onClose }: ItemSelectorProps) {
  const isPromotionValid = (promotion: any) => {
    if (!promotion?.is_active) return false;
    
    const now = new Date().getTime();
    const startDate = promotion.start_date ? new Date(promotion.start_date).getTime() : null;
    const endDate = promotion.end_date ? new Date(promotion.end_date).getTime() : null;
    
    // בדיקה אם המבצע פג תוקף
    if (endDate && now > endDate) return false;
    // בדיקה אם המבצע עוד לא התחיל
    if (startDate && now < startDate) return false;
    
    return true;
  };

  const calculateDiscountedPrice = (price: number, promotion: any) => {
    if (!promotion || !isPromotionValid(promotion)) return price;

    if (promotion.discount_type === 'percentage') {
      return price * (1 - promotion.discount_value / 100);
    } else {
      return price - promotion.discount_value;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {type === 'service' ? 'בחר שירות' : 'בחר מוצר'}
        </h3>
        <div className="space-y-2">
          {items.map((item) => {
            const hasValidPromotion = item.promotion && isPromotionValid(item.promotion);
            const finalPrice = calculateDiscountedPrice(item.price, item.promotion);
            const isOutOfStock = type === 'product' && item.stock_quantity === 0;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isOutOfStock) {
                    toast.error('המוצר אזל מהמלאי');
                    return;
                  }
                  onSelect({
                    ...item,
                    price: finalPrice, // שימוש במחיר המעודכן
                    original_price: item.price, // שמירת המחיר המקורי
                    promotion: hasValidPromotion ? item.promotion : undefined // שמירת המבצע רק אם הוא תקף
                  });
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-lg ${
                  isOutOfStock
                    ? 'bg-red-50 cursor-not-allowed'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
                disabled={isOutOfStock}
              >
                <div className="p-2 bg-white rounded-lg">
                  {type === 'service' ? (
                    <Scissors className="h-4 w-4 text-indigo-600" />
                  ) : (
                    <Package className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 text-right">
                  <div className="font-medium">{item.name_he}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {hasValidPromotion && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <Tag className="h-3 w-3" />
                        <span>
                          {item.promotion.discount_type === 'percentage'
                            ? `${item.promotion.discount_value}% הנחה`
                            : `${item.promotion.discount_value}₪ הנחה`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {hasValidPromotion && (
                        <span className="text-sm text-gray-400 line-through">
                          ₪{item.price.toLocaleString()}
                        </span>
                      )}
                      <span className={`text-sm ${hasValidPromotion ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        ₪{finalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                {type === 'product' && (
                  <div className={`text-sm ${
                    item.stock_quantity! > 0 
                      ? 'text-gray-500'
                      : 'text-red-500'
                  }`}>
                    {item.stock_quantity! > 0 
                      ? `מלאי: ${item.stock_quantity}`
                      : 'אזל מהמלאי'
                    }
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}