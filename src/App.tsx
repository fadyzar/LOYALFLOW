import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/auth/provider';
import BottomNav from './components/BottomNav';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccessGuard } from './components/appointments/DayView/hooks/useAccessGuard'; // Import the custom hook for access control
import ChoosePlanModal from './components/modals/ChoosePlanModal'; // Import the modal for subscription plans
// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isExternalPage = location.pathname.startsWith('/book/');
  const hideBottomNavPaths = ['/login', '/register', '/register/business', '/register/staff'];
  const showBottomNav = !isExternalPage && !hideBottomNavPaths.includes(location.pathname);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  React.useEffect(() => {
    (window as any).setModalOpen = setIsModalOpen;
  }, []);

  const { isBlocked } = useAccessGuard();

  return (
    <div
      dir="rtl"
      className={`min-h-screen relative ${
        !isExternalPage ? 'bg-gradient-to-br from-blue-50 via-white to-indigo-50' : ''
      }`}
    >
      {/* תמיד מציגים את התוכן */}
      {!isExternalPage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <AppRoutes />
        </div>
      )}
      {isExternalPage && <AppRoutes />}

      {/* בוטום נאב רק אם לא חסום */}
      {showBottomNav && !isModalOpen && !isBlocked && <BottomNav />}

      {/* כאן המודל מעל עם טשטוש רקע */}
      {isBlocked && <ChoosePlanModal />}

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '10px',
          },
        }}
      />
    </div>
  );
}

export default App;