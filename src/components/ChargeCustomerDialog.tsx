import React, { useState } from 'react';
import { chargeCustomer } from '../lib/chargeCustomer';
import toast from 'react-hot-toast';

interface ChargeCustomerDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  customerId: string;
  appointmentId?: string;
  defaultAmount?: number;
  defaultServiceDescription?: string;
  defaultCustomerName?: string;
  defaultCustomerEmail?: string;
  defaultCustomerPhone?: string;
  defaultCustomerAddress?: string;
}

const paymentMethods = [
  { value: 'credit_card', label: 'אשראי' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'bit', label: 'ביט' },
  { value: 'cash', label: 'מזומן' },
];

type PaymentMethod = 'credit_card' | 'bank_transfer' | 'bit' | 'cash';

export default function ChargeCustomerDialog({
  open,
  onClose,
  businessId,
  customerId,
  appointmentId,
  defaultAmount = 0,
  defaultServiceDescription = '',
  defaultCustomerName = '',
  defaultCustomerEmail = '',
  defaultCustomerPhone = '',
  defaultCustomerAddress = '',
}: ChargeCustomerDialogProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [serviceDescription, setServiceDescription] = useState(defaultServiceDescription);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerEmail, setCustomerEmail] = useState(defaultCustomerEmail);
  const [customerPhone, setCustomerPhone] = useState(defaultCustomerPhone);
  const [customerAddress, setCustomerAddress] = useState(defaultCustomerAddress);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('יש להזין סכום תקין');
    if (!serviceDescription) return toast.error('יש להזין תיאור שירות');
    if (!customerName) return toast.error('יש להזין שם לקוח');
    if (!customerEmail) return toast.error('יש להזין אימייל לקוח');
    setLoading(true);
    try {
      await chargeCustomer({
        businessId,
        customerId,
        appointmentId,
        amount,
        tipAmount,
        paymentMethod,
        serviceDescription,
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
      });
      toast.success('העסקה בוצעה בהצלחה!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'שגיאה בביצוע העסקה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-lg p-4 w-full max-w-md mx-auto relative">
        <button
          className="absolute left-4 top-4 text-gray-400 hover:text-red-500 font-bold"
          onClick={onClose}
          disabled={loading}
        >
          ✕
        </button>
        <h2 className="text-xl font-bold mb-4 text-center">חיוב לקוח</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-medium mb-1">סכום (₪)</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">טיפ (₪)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={tipAmount}
              onChange={e => setTipAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">אמצעי תשלום</label>
            <select
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              required
            >
              {paymentMethods.map(pm => (
                <option key={pm.value} value={pm.value}>{pm.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">תיאור שירות</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={serviceDescription}
              onChange={e => setServiceDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">שם לקוח</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">אימייל לקוח</label>
            <input
              type="email"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-1">טלפון לקוח</label>
            <input
              type="tel"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium mb-1">כתובת לקוח</label>
            <input
              type="text"
              className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700 active:scale-95 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? 'מעבד...' : 'בצע חיוב'}
          </button>
        </form>
      </div>
    </div>
  );
} 