import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Add error boundary for better error handling
const renderApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error('Root element not found');
      return;
    }
    
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Error rendering application:', error);
    
    // Fallback rendering in case of error
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: system-ui, sans-serif;">
          <h2>שגיאה בטעינת האפליקציה</h2>
          <p>אירעה שגיאה בטעינת האפליקציה. אנא רענן את הדף או נסה שוב מאוחר יותר.</p>
          <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4F46E5; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 16px;">
            רענן דף
          </button>
        </div>
      `;
    }
  }
};

// Initialize the app with a small delay to ensure DOM is fully loaded
setTimeout(renderApp, 0);