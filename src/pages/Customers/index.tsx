import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { Plus, Search, Filter, Star, Diamond, Ban, Upload, Download, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/auth/hooks';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { CustomerCard } from './components/CustomerCard';
import { CustomerForm } from './components/CustomerForm';
import CustomerDetails from './CustomerDetails';
import CustomerLoyalty from './CustomerLoyalty';
import CustomerDocuments from './CustomerDocuments';
import { ImportCustomersModal } from './components/ImportCustomersModal';
import { ExportCustomersModal } from './components/ExportCustomersModal';
import { useSubscription } from '../../hooks/useSubscription';
import { useLoyaltySettings } from '../../hooks/useLoyaltySettings';
import toast from 'react-hot-toast';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

type Customer = Database['public']['Tables']['customers']['Row'];

function Customers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled } = useLoyaltySettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loyaltyFilter, setLoyaltyFilter] = useState<string>('all');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);

  const loyaltyEnabled = isFeatureAvailable('loyalty_program') && isLoyaltyEnabled;

  useEffect(() => {
    loadBusinessData();
  }, []);

  useEffect(() => {
    if (location.state?.openNewCustomerModal) {
      setEditingCustomer(null);
      setShowForm(true);
    }
  }, [location.state]);

  useEffect(() => {
  // מאזין לאירוע חיצוני שצריך לרענן את רשימת הלקוחות
  const handleRefresh = () => {
    if (businessId) loadCustomers(businessId);
  };

  window.addEventListener('refresh-customers', handleRefresh);
  return () => window.removeEventListener('refresh-customers', handleRefresh);
}, [businessId]);

  const loadBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

      setBusinessId(userData.business_id);
      loadCustomers(userData.business_id);
    } catch (error: any) {
      console.error('Error loading business data:', error);
      toast.error(error.message || 'שגיאה בטעינת נתוני העסק');
      setLoading(false);
    }
  };

  const loadCustomers = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error loading customers:', error);
      toast.error('שגיאה בטעינת הלקוחות');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Customer>) => {
    if (!businessId) return;

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(data)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('הלקוח עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([{
            ...data,
            business_id: businessId,
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
          }]);

        if (error) throw error;
        toast.success('הלקוח נוסף בהצלחה');
      }

      setShowForm(false);
      setEditingCustomer(null);
      loadCustomers(businessId);
    } catch (error: any) {
  console.error('Error saving customer:', error);
  const friendly = getFriendlyErrorMessage(error.message);
  toast.error(friendly);
}
  };

  const handleImportComplete = async () => {
    // רענון רשימת הלקוחות מיד לאחר ייבוא
    if (businessId) {
      await loadCustomers(businessId);
    }
    toast.success('הייבוא הסתיים בהצלחה!');
    setImportModal(false);

    // Open customer card for the first imported customer
    if (normalized.length > 0 && normalized[0].id) {
      navigate(`/customers/${normalized[0].id}`);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLoyalty = loyaltyFilter === 'all' || customer.loyalty_level === loyaltyFilter;

    return matchesSearch && matchesLoyalty;
  });

  return (
    <Routes>
      <Route path="/" element={
        <div className="space-y-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">לקוחות</h1>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setEditingCustomer(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>לקוח חדש</span>
              </motion.button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setImportModal(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  ייבא
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setExportModal(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  ייצא
                </motion.button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חפש לקוחות..."
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-indigo-500" />
                  <div className="relative">
                    <select
                      value={loyaltyFilter}
                      onChange={(e) => setLoyaltyFilter(e.target.value)}
                      className="appearance-none p-2 pl-4 pr-10 rounded-xl bg-gradient-to-r from-indigo-50 to-white text-indigo-700 font-semibold shadow focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      disabled={!loyaltyEnabled}
                      style={{
                        minWidth: 130,
                        fontSize: '1rem',
                        borderRadius: 16,
                        boxShadow: '0 2px 8px #6366f11a',
                        outline: 'none',
                        backgroundImage: 'linear-gradient(90deg,#eef2ff 0%,#fff 100%)',
                        border: 'none',
                      }}
                    >
                      <option value="all">כל הרמות</option>
                      <option value="vip">VIP</option>
                      <option value="diamond">יהלום</option>
                      <option value="gold">זהב</option>
                      <option value="silver">כסף</option>
                      <option value="bronze">ברונזה</option>
                    </select>
                    {/* חץ מודרני ל-dropdown */}
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M5 7l4 4 4-4" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </div>
                {/* הצג רק חסומים, הסר נקודות ויהלומים */}
                {loyaltyEnabled && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Ban className="h-4 w-4 text-red-500" />
                      <span>
                        {customers.filter(c => c.metadata?.blocked).length} חסומים
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={() => navigate(`/customers/${customer.id}`)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">לא נמצאו לקוחות</p>
                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    setShowForm(true);
                  }}
                  className="mt-4 text-indigo-600 hover:text-indigo-700"
                >
                  הוסף לקוח חדש
                </button>
              </div>
            )}
          </div>

          {/* Modals */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              >
                <CustomerForm
                  customer={editingCustomer || undefined}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingCustomer(null);
                  }}
                />
              </motion.div>
            )}

            {importModal && businessId && (
              <ImportCustomersModal
                onClose={() => setImportModal(false)}
                onImportComplete={handleImportComplete}
                businessId={businessId}
              />
            )}

            {exportModal && (
              <ExportCustomersModal
                onClose={() => setExportModal(false)}
                customers={customers}
              />
            )}
          </AnimatePresence>
        </div>
      } />
      <Route path=":id" element={<CustomerDetails />} />
      <Route path=":id/loyalty" element={<CustomerLoyalty />} />
      <Route path=":id/documents" element={<CustomerDocuments />} />
    </Routes>
  );
}

export default Customers;