import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes';
import { AuthProvider } from './contexts/auth/provider';
import BottomNav from './components/BottomNav';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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


  // Add state to track if modal is open
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Expose the state through window for other components to access
  React.useEffect(() => {
    (window as any).setModalOpen = setIsModalOpen;
  }, []);

  return (
    <div dir="rtl" className={`min-h-screen ${!isExternalPage ? 'bg-gradient-to-br from-blue-50 via-white to-indigo-50' : ''}`}>
      {!isExternalPage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <AppRoutes />
        </div>
      )}
      {isExternalPage && <AppRoutes />}
      {showBottomNav && !isModalOpen && <BottomNav />}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '10px',
          },
          success: {
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;