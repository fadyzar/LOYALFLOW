import React, { useState, useEffect } from 'react';
import { User, Search } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface CustomerSelectProps {
  businessId: string;
  value: string;
  customerData: {
    name?: string;
    phone?: string;
    email?: string;
  };
  onChange: (customerId: string, data?: { name: string; phone: string; email?: string }) => void;
}

export function CustomerSelect({ businessId, value, customerData, onChange }: CustomerSelectProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [businessId]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('שגיאה בטעינת הלקוחות');
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerData.name || !customerData.phone) {
      toast.error('יש להזין שם וטלפון');
      return;
    }

    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          points: 0,
          diamonds: 0,
          loyalty_level: 'bronze',
          loyalty_stats: {
            total_visits: 0,
            consecutive_visits: 0,
            last_visit: null,
            referrals: 0,
            total_spent: 0,
            achievements: []
          }
        })
        .select()
        .single();

      if (error) throw error;

      onChange(customer.id, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      });
      setCustomers(prev => [...prev, customer]);
      setSearchTerm(customer.name);
      setShowList(false);
      toast.success('הלקוח נוסף בהצלחה');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('שגיאה ביצירת הלקוח');
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>בחר לקוח</span>
        </div>
      </label>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowList(true);
            onChange('', { name: e.target.value, phone: '', email: '' });
          }}
          onFocus={() => setShowList(true)}
          className="w-full p-2 border border-gray-300 rounded-lg"
          placeholder="חפש לפי שם או טלפון..."
        />
        {showList && (
          <div 
            id="customer-list"
            className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 max-h-48 overflow-y-auto z-50"
          >
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  onChange(customer.id, {
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email
                  });
                  setSearchTerm(customer.name);
                  setShowList(false);
                }}
                className="w-full px-4 py-2 text-right hover:bg-gray-50"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">{customer.phone}</div>
              </button>
            ))}
            {searchTerm && filteredCustomers.length === 0 && (
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-500 text-center">
                  לא נמצאו לקוחות
                </p>
                <div className="space-y-2">
                  <input
                    type="tel"
                    value={customerData.phone || ''}
                    onChange={(e) => onChange(value, {
                      ...customerData,
                      phone: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="מספר טלפון"
                    dir="ltr"
                  />
                  <input
                    type="email"
                    value={customerData.email || ''}
                    onChange={(e) => onChange(value, {
                      ...customerData,
                      email: e.target.value
                    })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="אימייל (אופציונלי)"
                    dir="ltr"
                  />
                  <button
                    onClick={handleCreateCustomer}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    צור לקוח חדש
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}