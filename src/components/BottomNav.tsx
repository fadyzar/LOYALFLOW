import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Calendar, Users, Settings, Home, PlusCircle, FileText } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import ChargeCustomerFlow from './ChargeCustomerFlow';
import { useAuth } from '../contexts/auth/hooks';
import ReactDOM from 'react-dom';

const navItems = [
  { icon: Home, label: 'דשבורד', path: '/dashboard' },
  // { icon: Calendar, label: 'יומן', path: '/appointments' },
  { icon: Calendar, label: 'יומן', path: '/calendar' },

  { icon: PlusCircle, label: 'תור חדש', path: '/appointments/new', primary: true },
  { icon: Users, label: 'לקוחות', path: '/customers' },
  { icon: Settings, label: 'הגדרות', path: '/settings' }
];

const fabItems = [
  { icon: Calendar, label: 'תור חדש', path: '/appointments/new', color: 'bg-indigo-600', requiredFeature: null, type: 'link' },
  { icon: Users, label: 'לקוח חדש', color: 'bg-emerald-600', requiredFeature: null, type: 'navigate', navigateTo: '/customers', state: { openNewCustomerModal: true } },
  { icon: FileText, label: 'חייב לקוח', color: 'bg-purple-600', requiredFeature: null, type: 'charge' },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const { isFeatureAvailable } = useSubscription();
  const [showChargeDialog, setShowChargeDialog] = useState(false);
  const { business } = useAuth();

  const isSettingsSubpage = location.pathname.startsWith('/settings/');
  const isCustomersSubpage = location.pathname.startsWith('/customers/');
  const isAppointmentsSubpage = location.pathname.startsWith('/appointments/');

  const availableFabItems = fabItems.filter(item => 
    item.requiredFeature === null || isFeatureAvailable(item.requiredFeature)
  );

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe"
    >
      <div className="max-w-lg mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {navItems.map((item) => {
            const isActive = 
              location.pathname === item.path ||
              (isSettingsSubpage && item.path === '/settings') ||
              (isCustomersSubpage && item.path === '/customers') ||
              (isAppointmentsSubpage && item.path === '/appointments');

            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center flex-1 ${item.primary ? '-mt-8' : ''}`}
              >
                {item.primary ? (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ rotate: showFabMenu ? 45 : 0 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowFabMenu(!showFabMenu);
                    }}
                    className="absolute -top-5 bg-indigo-600 text-white p-4 rounded-full shadow-lg"
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs mt-1">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-1 w-12 h-0.5 bg-indigo-600 rounded-full"
                      />
                    )}
                  </motion.div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showFabMenu && availableFabItems.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowFabMenu(false)}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-24 inset-x-0 z-50 px-4"
            >
              <div className="max-w-lg mx-auto flex flex-col items-center gap-4">
                {availableFabItems.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 20, delay: index * 0.1 } }}
                    exit={{ opacity: 0, scale: 0.8, y: 20, transition: { duration: 0.2, delay: (availableFabItems.length - 1 - index) * 0.05 } }}
                  >
                    {item.type === 'link' && item.path ? (
                      <Link
                        to={item.path}
                        className="flex items-center gap-3 w-full"
                        onClick={() => setShowFabMenu(false)}
                      >
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center gap-3 w-full ${item.color} text-white p-4 rounded-2xl shadow-sm`}
                        >
                          <item.icon className="h-6 w-6" />
                          <span className="font-medium">{item.label}</span>
                        </motion.div>
                      </Link>
                    ) : item.type === 'navigate' ? (
                      <button
                        type="button"
                        className={`flex items-center gap-3 w-full ${item.color} text-white p-4 rounded-2xl shadow-sm font-medium justify-center`}
                        onClick={() => {
                          setShowFabMenu(false);
                          navigate(item.navigateTo, { state: item.state });
                        }}
                      >
                        <item.icon className="h-6 w-6" />
                        <span>{item.label}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`flex items-center gap-3 w-full ${item.color} text-white p-4 rounded-2xl shadow-sm font-medium justify-center`}
                        onClick={() => {
                          setShowFabMenu(false);
                          setShowChargeDialog(true);
                        }}
                      >
                        <item.icon className="h-6 w-6" />
                        <span>{item.label}</span>
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showChargeDialog && business?.id && (
        <Portal>
          <ChargeCustomerFlow
            open={showChargeDialog}
            onClose={() => setShowChargeDialog(false)}
            businessId={business.id}
          />
        </Portal>
      )}
      {showChargeDialog && !business?.id && (
        <Portal>
          <ChargeCustomerFlow
            open={showChargeDialog}
            onClose={() => setShowChargeDialog(false)}
          />
        </Portal>
      )}
    </motion.div>
  );
}

function Portal({ children }: { children: React.ReactNode }) {
  const portalRoot = document.getElementById('portal-root') || document.body;
  return ReactDOM.createPortal(children, portalRoot);
}

export default BottomNav;
