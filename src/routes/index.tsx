import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth/hooks';
import { useSubscription } from '../hooks/useSubscription';
import Login from '../pages/Login';
import { RegistrationWizard } from '../components/registration/RegistrationWizard';
import { RegistrationProvider } from '../contexts/registration/provider';
import Dashboard from '../pages/Dashboard';
import Appointments from '../pages/Appointments';
import { NewAppointmentFlow } from '../components/appointments/NewAppointmentFlow';
import Customers from '../pages/Customers';
import Settings from '../pages/Settings';
import BusinessHours from '../pages/Settings/BusinessHours';
import BusinessServices from '../pages/Settings/BusinessServices';
import BusinessProducts from '../pages/Settings/BusinessProducts';
import BusinessStaff from '../pages/Settings/BusinessStaff';
import BusinessSettings from '../pages/Settings/BusinessSettings';
import LoyaltySettings from '../pages/Settings/LoyaltySettings';
import NotificationSettings from '../pages/Settings/NotificationSettings';
import ExternalPageSettings from '../pages/Settings/ExternalPageSettings';
import ExternalPage from '../pages/ExternalPage';
import Statistics from '../pages/Statistics';
import Invoices from '../pages/Settings/Invoices';

// רכיב עטיפה לבדיקת זמינות תכונה
const FeatureProtectedRoute = ({ 
  children, 
  featureCode, 
  fallbackPath = '/settings' 
}: { 
  children: React.ReactNode; 
  featureCode: string; 
  fallbackPath?: string;
}) => {
  const { isFeatureAvailable } = useSubscription();
  
  // אם זה קוד תכונה של תוכנית נאמנות, נחזיר true כדי לאפשר גישה
  if (featureCode === 'loyalty_program') {
    return <>{children}</>;
  }
  
  if (!isFeatureAvailable(featureCode)) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  const RegistrationRoutes = () => (
    <RegistrationProvider>
      <RegistrationWizard />
    </RegistrationProvider>
  );

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/dashboard" />} 
      />
      <Route 
        path="/register" 
        element={<Navigate to="/register/business" replace />} 
      />
      <Route 
        path="/register/business" 
        element={<RegistrationRoutes />} 
      />
      <Route 
        path="/register/staff" 
        element={<RegistrationRoutes />} 
      />

      {/* External Page Route */}
      <Route
        path="/book/:businessLink"
        element={<ExternalPage />}
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/login" />}
      />
      <Route
        path="/appointments"
        element={user ? <Appointments /> : <Navigate to="/login" />}
      />
      <Route
        path="/statistics"
        element={user ? <Statistics /> : <Navigate to="/login" />}
      />
      <Route
        path="/appointments/new"
        element={user ? <NewAppointmentFlow onClose={() => window.history.back()} onSuccess={() => window.history.back()} /> : <Navigate to="/login" />}
      />
      <Route
        path="/customers/*"
        element={user ? <Customers /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings"
        element={user ? <Settings /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/business"
        element={user ? <BusinessSettings /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/hours"
        element={user ? <BusinessHours /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/services"
        element={user ? <BusinessServices /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/products"
        element={user ? <BusinessProducts /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/staff"
        element={user ? <BusinessStaff /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/notifications"
        element={user ? <NotificationSettings /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/external-page"
        element={user ? <ExternalPageSettings /> : <Navigate to="/login" />}
      />
      <Route
        path="/settings/loyalty"
        element={
          user ? (
            <FeatureProtectedRoute featureCode="loyalty_program">
              <LoyaltySettings />
            </FeatureProtectedRoute>
          ) : <Navigate to="/login" />
        }
      />
      <Route
        path="/settings/invoices"
        element={user ? <Invoices /> : <Navigate to="/login" />}
      />

      {/* Default Route */}
      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} />}
      />

      {/* 404 Route */}
      <Route
        path="*"
        element={<Navigate to="/" />}
      />
    </Routes>
  );
}

export default AppRoutes;