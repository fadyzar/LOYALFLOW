import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Phone, Mail, Plus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';

interface CustomerSelectorProps {
  formData: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
  };
  onChange: (data: any) => void;
  onSubmit: () => void;
  submitLabel?: string;
  businessId?: string;
}

export function CustomerSelector({ formData, onChange, onSubmit, submitLabel, businessId }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const { customers, loading, searchCustomers } = useCustomers(businessId);

  useEffect(() => {
    if (businessId) {
      console.log("CustomerSelector using provided businessId:", businessId);
    }
  }, [businessId]);

  useEffect(() => {
    if (searchTerm) {
      // לוג לבדיקה
      console.log('Searching for:', searchTerm, 'in business:', businessId);
      const delaySearch = setTimeout(() => {
        searchCustomers(searchTerm);
      }, 300); // דיליי קטן למניעת חיפושים מיותרים

      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, searchCustomers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!showNewForm ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="חפש לפי שם או טלפון..."
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {customers.length > 0 && (
            <div className="space-y-2">
              {customers.map((customer) => (
                <motion.button
                  key={customer.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    onChange({
                      ...formData,
                      customerId: customer.id,
                      customerName: customer.name,
                      customerPhone: customer.phone,
                      customerEmail: customer.email
                    });
                    onSubmit();
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl text-right hover:bg-gray-100"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-lg font-medium text-indigo-600">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}

          {searchTerm && customers.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">לא נמצאו לקוחות</p>
              <button
                type="button"
                onClick={() => setShowNewForm(true)}
                className="text-indigo-600 hover:text-indigo-700"
              >
                הוסף לקוח חדש
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>שם מלא</span>
              </div>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => onChange({ ...formData, customerName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>טלפון</span>
              </div>
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => onChange({ ...formData, customerPhone: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
              placeholder="050-1234567"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>אימייל (אופציונלי)</span>
              </div>
            </label>
            <input
              type="email"
              value={formData.customerEmail}
              onChange={(e) => onChange({ ...formData, customerEmail: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="email@example.com"
              dir="ltr"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-4">
        {showNewForm && (
          <button
            type="button"
            onClick={() => setShowNewForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            חזרה לחיפוש
          </button>
        )}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          <span>{submitLabel || 'קבע תור'}</span>
        </motion.button>
      </div>
    </form>
  );
}