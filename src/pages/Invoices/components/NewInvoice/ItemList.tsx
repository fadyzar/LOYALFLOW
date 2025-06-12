import React from 'react';
import { motion } from 'framer-motion';
import { Package, Scissors, X, Tag } from 'lucide-react';

interface ItemListProps {
  items: Array<{
    id: string;
    type: 'service' | 'product';
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    original_price?: number;
    promotion?: {
      discount_type: 'percentage' | 'fixed';
      discount_value: number;
      start_date?: string;
      end_date?: string;
    };
  }>;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function ItemList({ items, onQuantityChange, onRemove }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          לא נבחרו פריטים
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
        >
          <div className="p-2 bg-white rounded-lg">
            {item.type === 'service' ? (
              <Scissors className="h-4 w-4 text-indigo-600" />
            ) : (
              <Package className="h-4 w-4 text-indigo-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{item.description}</span>
              <span className="text-indigo-600">₪{item.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">כמות:</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value))}
                  className="w-16 p-1 border border-gray-300 rounded-lg text-center"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                {item.original_price && item.original_price !== item.unit_price && (
                  <span className="text-sm text-gray-400 line-through">
                    ₪{item.original_price.toLocaleString()} ליחידה
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  ₪{item.unit_price.toLocaleString()} ליחידה
                </span>
              </div>
              {item.promotion && (
                <div className="flex items-center gap-1 text-green-600 text-sm">
                  <Tag className="h-3 w-3" />
                  <span>
                    {item.promotion.discount_type === 'percentage'
                      ? `${item.promotion.discount_value}% הנחה`
                      : `${item.promotion.discount_value}₪ הנחה`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}