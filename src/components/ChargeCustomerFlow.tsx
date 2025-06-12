import React, { useState, useEffect } from 'react';
import { FileText, ChevronLeft, CreditCard, Smartphone, Apple, DollarSign, Coins, CheckCircle, User, Loader } from 'lucide-react';
import { CustomerSelector } from './appointments/CustomerSelector';
import { motion } from 'framer-motion';
import { chargeCustomer } from '../lib/chargeCustomer';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';

const paymentMethods = [
  { key: 'credit_card', label: 'כרטיס אשראי', icon: <CreditCard className="h-5 w-5" /> },
  { key: 'bit', label: 'BIT', icon: <Smartphone className="h-5 w-5" /> },
  { key: 'bank_transfer', label: 'העברה בנקאית', icon: <DollarSign className="h-5 w-5" /> },
  { key: 'cash', label: 'מזומן', icon: <Coins className="h-5 w-5" /> },
  { key: 'other', label: 'אחר', icon: <DollarSign className="h-5 w-5" /> },
];

const tipOptions = [5, 10, 15];

export default function ChargeCustomerFlow({ open, onClose, businessId: propBusinessId }: { open: boolean; onClose: () => void; businessId?: string }) {
  const { business, user } = useAuth();
  const [businessId, setBusinessId] = useState<string>('');
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: '',
    tipPercent: null as null | number,
    tipAmount: '',
    amount: '',
    installments: '1',
  });

  // רכיב טעינה עבור בדיקת מטא-דאטה
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // שלב א' - שליפת מזהה העסק מ-metadata או מ-prop
  useEffect(() => {
    async function fetchBusinessIdFromMetadata() {
      if (!open) return;
      
      setLoadingMetadata(true);
      try {
        // קודם כל בדוק אם יש לנו את מזהה העסק מהפרופס
        if (propBusinessId && propBusinessId.trim() !== '') {
          console.log("Using businessId from props:", propBusinessId);
          setBusinessId(propBusinessId);
          setError(null);
          return;
        }

        // אחרת, נסה לקבל מ-context
        if (business?.id) {
          console.log("Using businessId from auth context:", business.id);
          setBusinessId(business.id);
          setError(null);
          return;
        }

        // אם אין לנו עדיין, בדוק במטא-דאטה של המשתמש
        if (user) {
          const { data: metadata, error: metadataError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (metadataError) {
            console.error("Error fetching business_id from metadata:", metadataError);
            throw new Error('לא ניתן לאתר את מזהה העסק');
          }

          if (metadata && metadata.business_id) {
            console.log("Using businessId from user metadata:", metadata.business_id);
            setBusinessId(metadata.business_id);
            setError(null);
            return;
          }
        }

        // אם לא מצאנו מזהה עסק באף מקום
        throw new Error('לא ניתן לאתר את מזהה העסק');
      } catch (error: any) {
        console.error("Failed to get business ID:", error);
        setError(error.message || 'אירעה שגיאה בהשגת מזהה העסק');
      } finally {
        setLoadingMetadata(false);
      }
    }

    fetchBusinessIdFromMetadata();
  }, [open, propBusinessId, business, user]);

  // שלב ב' - איפוס הטופס כשסוגרים את החלון
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedCustomer(null);
      setError(null);
      setFormData({
        customerId: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        paymentMethod: '',
        tipPercent: null,
        tipAmount: '',
        amount: '',
        installments: '1',
      });
    }
  }, [open]);

  if (!open) return null;
  
  // הצגת מסך טעינה בזמן שמושכים את מזהה העסק
  if (loadingMetadata) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-lg p-4 max-w-md w-full">
          <div className="flex flex-col items-center justify-center py-4">
            <Loader className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-gray-700">טוען נתוני עסק...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // הצגת הודעת שגיאה אם יש בעיה עם מזהה העסק
  if (error || !businessId || businessId.trim() === '') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-lg p-4 max-w-md w-full">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-red-600">שגיאה</h3>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-700">{error || 'מזהה העסק חסר. לא ניתן להמשיך בתהליך החיוב.'}</p>
          <p className="text-gray-500 text-sm mt-1">אנא רענן את הדף או התחבר מחדש למערכת.</p>
          <button 
            className="w-full mt-4 bg-indigo-600 text-white rounded-xl py-2 font-medium"
            onClick={onClose}
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Customer selection
  if (step === 1) {
    return (
      <PopupCard title="בחירת לקוח לחיוב" onClose={onClose}>
        <CustomerSelector
          formData={formData}
          onChange={data => setFormData({ ...formData, ...data })}
          onSubmit={() => {
            setSelectedCustomer(formData);
            setStep(2);
          }}
          submitLabel="המשך לבחירת אמצעי תשלום"
          businessId={businessId} // העברת מזהה העסק לקומפוננטת בחירת לקוח
        />
      </PopupCard>
    );
  }

  // Step 2: Payment method
  if (step === 2) {
    return (
      <PopupCard title="בחר אמצעי תשלום" onClose={onClose} onBack={() => setStep(1)}>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {paymentMethods.map(pm => (
            <motion.button
              key={pm.key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-gray-700 bg-gray-50 hover:bg-indigo-50 transition ${formData.paymentMethod === pm.key ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200'}`}
              onClick={() => {
                setFormData(f => ({ ...f, paymentMethod: pm.key }));
                setStep(3);
              }}
            >
              {pm.icon}
              <span className="text-sm">{pm.label}</span>
            </motion.button>
          ))}
        </div>
      </PopupCard>
    );
  }

  // Step 3: Tip selection
  if (step === 3) {
    return (
      <PopupCard title="הוסף טיפ (אופציונלי)" onClose={onClose} onBack={() => setStep(2)}>
        <div className="space-y-3 mt-3">
          <p className="text-sm text-gray-500">בחר אחוז טיפ או הזן סכום מותאם אישית</p>
          <div className="flex flex-wrap gap-2">
            {tipOptions.map(percent => (
              <motion.button
                key={percent}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 rounded-xl border px-3 py-2 text-gray-700 bg-gray-50 hover:bg-emerald-50 transition ${formData.tipPercent === percent ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium' : 'border-gray-200'}`}
                onClick={() => setFormData(f => ({ ...f, tipPercent: percent, tipAmount: '' }))}
              >
                {percent}%
              </motion.button>
            ))}
            <div className="flex-1 min-w-[100px]">
              <input
                type="number"
                min={0}
                placeholder="סכום בשקלים"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-center focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                value={formData.tipAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(f => ({ ...f, tipAmount: e.target.value, tipPercent: null }))}
              />
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-5 bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 transition"
          onClick={() => setStep(4)}
        >
          המשך לסכום לחיוב
        </motion.button>
      </PopupCard>
    );
  }

  // Step 4: Amount and installments
  if (step === 4) {
    return (
      <PopupCard title="סכום לחיוב" onClose={onClose} onBack={() => setStep(3)}>
        <div className="space-y-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סכום (₪)</label>
            <input
              type="number"
              min={1}
              className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formData.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מספר תשלומים</label>
            <input
              type="number"
              min={1}
              max={12}
              className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={formData.installments}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(f => ({ ...f, installments: e.target.value }))}
              required
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-5 bg-indigo-600 text-white rounded-xl py-2.5 font-medium hover:bg-indigo-700 transition"
          onClick={() => setStep(5)}
        >
          לסיכום ואישור
        </motion.button>
      </PopupCard>
    );
  }

  // Step 5: Summary and confirm
  return (
    <PopupCard title="סיכום ואישור" onClose={onClose} onBack={() => !loading && setStep(4)}>
      <div className="space-y-3 mt-3">
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-medium text-indigo-600">
                {formData.customerName.charAt(0)}
              </span>
            </div>
            <span className="font-medium">{formData.customerName}</span>
          </div>
          <p className="text-sm text-gray-500 mr-10">{formData.customerPhone}</p>
        </div>
        
        <div className="space-y-2 p-3 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">אמצעי תשלום:</span>
            <span className="font-medium">{paymentMethods.find(pm => pm.key === formData.paymentMethod)?.label}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">סכום לחיוב:</span>
            <span className="font-medium">{formData.amount} ₪</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">טיפ:</span>
            <span className="font-medium">{formData.tipPercent ? `${formData.tipPercent}%` : formData.tipAmount ? `${formData.tipAmount} ₪` : 'ללא'}</span>
          </div>
          {(formData.tipPercent || formData.tipAmount) && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">סכום טיפ:</span>
              <span className="font-medium">
                {formData.tipPercent 
                  ? `${(parseFloat(formData.amount || '0') * (formData.tipPercent / 100)).toFixed(2)} ₪`
                  : `${formData.tipAmount} ₪`}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">מספר תשלומים:</span>
            <span className="font-medium">{formData.installments}</span>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2">
            <div className="flex justify-between items-center font-bold">
              <span className="text-gray-800">סה"כ לתשלום:</span>
              <span className="text-indigo-700">
                {(() => {
                  const baseAmount = parseFloat(formData.amount || '0');
                  let tipAmount = 0;
                  
                  if (formData.tipPercent) {
                    tipAmount = baseAmount * (formData.tipPercent / 100);
                  } else if (formData.tipAmount) {
                    tipAmount = parseFloat(formData.tipAmount);
                  }
                  
                  return `${(baseAmount + tipAmount).toFixed(2)} ₪`;
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
      <motion.button
        whileHover={{ scale: loading ? 1 : 1.02 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className={`w-full mt-5 ${loading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl py-2.5 font-medium transition flex items-center justify-center gap-2`}
        onClick={async () => {
          if (loading) return;
          
          let missingFields = [];
          
          if (!businessId || businessId.trim() === '') {
            toast.error('מזהה העסק חסר. אנא התחבר מחדש למערכת.');
            console.error("businessId is missing:", businessId);
            return;
          }
          
          if (!formData.customerId) missingFields.push('מזהה לקוח');
          if (!formData.customerName) missingFields.push('שם לקוח');
          if (!formData.paymentMethod) missingFields.push('אמצעי תשלום');
          if (!formData.amount) missingFields.push('סכום לחיוב');
          
          console.log('ערכי שדות חובה:', {
            businessId,
            customerId: formData.customerId,
            customerName: formData.customerName,
            customerEmail: formData.customerEmail,
            paymentMethod: formData.paymentMethod,
            amount: formData.amount || ''
          });
          
          if (missingFields.length > 0) {
            toast.error(`נא למלא את השדות הבאים: ${missingFields.join(', ')}`);
            return;
          }

          setLoading(true);
          try {
            let tipAmount = 0;
            if (formData.tipPercent) {
              tipAmount = parseFloat(formData.amount) * (formData.tipPercent / 100);
            } else if (formData.tipAmount) {
              tipAmount = parseFloat(formData.tipAmount);
            }

            await chargeCustomer({
              businessId: businessId, // שימוש במזהה העסק המאומת
              customerId: formData.customerId,
              amount: parseFloat(formData.amount),
              tipAmount,
              paymentMethod: formData.paymentMethod as any,
              serviceDescription: 'חיוב דרך מערכת התורים',
              customerName: formData.customerName,
              customerEmail: formData.customerEmail || '',
              customerPhone: formData.customerPhone || undefined,
              customerAddress: '',
            });
            
            toast.success('החיוב בוצע בהצלחה!');
            onClose();
          } catch (error: any) {
            console.error('שגיאה בביצוע החיוב:', error);
            toast.error(error.message || 'אירעה שגיאה בביצוע החיוב');
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader className="h-5 w-5 animate-spin" />
            <span>מבצע חיוב...</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>אשר וחייב</span>
          </>
        )}
      </motion.button>
    </PopupCard>
  );
}

function PopupCard({ title, children, onClose, onBack }: { title: string; children: React.ReactNode; onClose: () => void; onBack?: () => void }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-lg w-full max-w-[95%] sm:max-w-[360px] mx-auto relative border border-gray-200"
      >
        {/* כותרת עם לחצן חזרה */}
        <div className="flex items-center px-4 pt-4 pb-2 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-t-2xl">
          {onBack && (
            <button
              className="ml-0 mr-1 text-gray-500 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              onClick={onBack}
              aria-label="חזור לשלב הקודם"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {title.includes('לקוח') ? <FileText className="h-5 w-5 text-indigo-600" /> : <CreditCard className="h-5 w-5 text-indigo-600" />}
            <h2 className="text-base font-medium text-gray-900">{title}</h2>
          </div>
          
          {/* לחצן סגירה (X) */}
          <button
            className="absolute top-3 left-3 z-10 bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full p-1.5 shadow-sm transition-all"
            onClick={onClose}
            aria-label="סגור"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="px-4 pt-3 pb-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function UserIcon() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 font-bold">
      <User className="h-4 w-4" />
    </span>
  );
} 