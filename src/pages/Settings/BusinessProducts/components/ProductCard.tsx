import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Tag, Package } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isPromotionValid = (promotion: Product['promotion']) => {
    if (!promotion?.is_active) return false;
    
    const now = new Date().getTime();
    const startDate = promotion.start_date ? new Date(promotion.start_date).getTime() : null;
    const endDate = promotion.end_date ? new Date(promotion.end_date).getTime() : null;
    
    if (endDate && now > endDate) return false;
    if (startDate && now < startDate) return false;
    
    return true;
  };

  const hasPromotion = product.promotion && isPromotionValid(product.promotion);
  const originalPrice = product.price;
  let finalPrice = originalPrice;
  
  if (hasPromotion && product.promotion) {
    if (product.promotion.discount_type === 'percentage') {
      finalPrice = originalPrice * (1 - product.promotion.discount_value / 100);
    } else {
      finalPrice = originalPrice - (product.promotion?.discount_value || 0);
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {product.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name_he}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{product.name_he}</h3>
            {product.sku && (
              <p className="text-sm text-gray-500">מק"ט: {product.sku}</p>
            )}
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(product)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <Edit2 className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(product.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {product.description && (
          <p className="mt-2 text-sm text-gray-600">{product.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-500">
              <Package className="h-4 w-4" />
              <span>מלאי: {product.stock_quantity}</span>
            </div>
            
            {hasPromotion && product.promotion && (
              <div className="flex items-center gap-1 text-green-600">
                <Tag className="h-4 w-4" />
                <span>
                  {product.promotion.discount_type === 'percentage'
                    ? `${product.promotion.discount_value}% הנחה`
                    : `${product.promotion.discount_value}₪ הנחה`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasPromotion && (
              <span className="text-gray-400 line-through">₪{originalPrice}</span>
            )}
            <span className={`font-medium ${hasPromotion ? 'text-green-600' : 'text-indigo-600'}`}>
              ₪{finalPrice}
            </span>
          </div>
        </div>

        {hasPromotion && product.promotion?.start_date && product.promotion?.end_date && (
          <div className="mt-2 text-xs text-gray-500">
            בתוקף מ-{new Date(product.promotion.start_date).toLocaleDateString('he-IL')} עד {new Date(product.promotion.end_date).toLocaleDateString('he-IL')}
          </div>
        )}

        {product.stock_quantity <= product.min_stock_quantity && (
          <div className="mt-2 text-xs text-red-600">
            * כמות במלאי נמוכה מהמינימום הנדרש
          </div>
        )}
      </div>
    </motion.div>
  );
}