import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  FileText,
  Calendar,
  User,
  Package,
  Scissors,
  Plus
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface CreditNoteFormProps {
  onClose: () => void;
  onSuccess: () => void;
  originalInvoice: any;
}

export function CreditNoteForm({ onClose, onSuccess, originalInvoice }: CreditNoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');

  // Hide bottom nav when modal is open
  useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

  useEffect(() => {
    // Load original invoice items
    const loadItems = async () => {
      try {
        const { data, error } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', originalInvoice.id);

        if (error) throw error;

        setItems(data.map((item: any) => ({
          ...item,
          selected: false,
          refund_quantity: item.quantity
        })));
      } catch (error) {
        console.error('Error loading invoice items:', error);
        toast.error('שגיאה בטעינת פריטי החשבונית');
      }
    };

    loadItems();
  }, [originalInvoice.id]);

  const calculateTotal = () => {
    return items
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (item.unit_price * item.refund_quantity), 0);
  };

  const calculateTax = () => {
    return originalInvoice.tax_rate ? calculateTotal() * (originalInvoice.tax_rate / 100) : 0;
  };

  const handleSubmit = async () => {
    const selectedItems = items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast.error('יש לבחור לפחות פריט אחד לזיכוי');
      return;
    }

    try {
      setLoading(true);

      // Get next credit note number
      const { data: numberData, error: numberError } = await supabase
        .rpc('generate_invoice_number', {
          p_business_id: originalInvoice.business_id,
          p_type: 'credit_note'
        });

      if (numberError) throw numberError;

      // Create credit note
      const { data: creditNote, error: creditNoteError } = await supabase
        .from('invoices')
        .insert({
          business_id: originalInvoice.business_id,
          customer_id: originalInvoice.customer_id,
          number: numberData,
          type: 'credit_note',
          status: 'issued',
          subtotal: calculateTotal(),
          tax_rate: originalInvoice.tax_rate,
          tax_amount: calculateTax(),
          total: calculateTotal() + calculateTax(),
          notes: notes || `זיכוי עבור חשבונית מספר ${originalInvoice.number}`,
          original_invoice_id: originalInvoice.id,
          is_original: true
        })
        .select()
        .single();

      if (creditNoteError) throw creditNoteError;

      // Create credit note items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(selectedItems.map(item => ({
          invoice_id: creditNote.id,
          service_id: item.service_id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.refund_quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_rate ? (item.unit_price * item.refund_quantity * item.tax_rate / 100) : 0,
          total: item.unit_price * item.refund_quantity
        })));

      if (itemsError) throw itemsError;

      toast.success('חשבונית הזיכוי נוצרה בהצלחה');
      onSuccess();
    } catch (error) {
      console.error('Error creating credit note:', error);
      toast.error('שגיאה ביצירת חשבונית זיכוי');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">יצירת חשבונית זיכוי</h2>
                <p className="text-sm text-gray-500">
                  עבור חשבונית מספר {originalInvoice.number}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Customer Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-gray-400" />
              <h3 className="font-medium">פרטי לקוח</h3>
            </div>
            <div className="space-y-1">
              <p className="font-medium">{originalInvoice.customer_name}</p>
              <p className="text-sm text-gray-500">{originalInvoice.customer_phone}</p>
              {originalInvoice.customer_email && (
                <p className="text-sm text-gray-500">{originalInvoice.customer_email}</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="font-medium mb-4">בחר פריטים לזיכוי</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    item.selected ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  } border`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        setItems(prev => prev.map(i => 
                          i.id === item.id ? { ...i, selected: e.target.checked } : i
                        ));
                      }}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <div className="p-2 bg-white rounded-lg">
                      {item.service_id ? (
                        <Scissors className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Package className="h-4 w-4 text-indigo-600" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.description}</span>
                      <span className="text-indigo-600">
                        ₪{(item.unit_price * (item.selected ? item.refund_quantity : item.quantity)).toLocaleString()}
                      </span>
                    </div>
                    {item.selected && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-500">כמות לזיכוי:</label>
                          <input
                            type="number"
                            value={item.refund_quantity}
                            onChange={(e) => {
                              const value = Math.min(
                                Math.max(1, parseInt(e.target.value)),
                                item.quantity
                              );
                              setItems(prev => prev.map(i => 
                                i.id === item.id ? { ...i, refund_quantity: value } : i
                              ));
                            }}
                            className="w-16 p-1 border border-gray-300 rounded-lg text-center"
                            min="1"
                            max={item.quantity}
                          />
                          <span className="text-sm text-gray-500">
                            (מתוך {item.quantity})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              הערות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-lg resize-none"
              placeholder="סיבת הזיכוי..."
            />
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">סה"כ לפני מע"מ</span>
              <span className="font-medium">₪{calculateTotal().toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">
                מע"מ {originalInvoice.tax_rate}%
              </span>
              <span className="font-medium">₪{calculateTax().toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-lg pt-2 border-t border-gray-200">
              <span className="font-medium">סה"כ לזיכוי</span>
              <span className="font-bold text-red-600">
                ₪{(calculateTotal() + calculateTax()).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>יוצר זיכוי...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span>צור חשבונית זיכוי</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}