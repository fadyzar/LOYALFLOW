import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Set to false to prevent URL parsing
    storage: {
      getItem: (key) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      }
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'loyalflow-app'
    },
    // בסביבת פיתוח, אנחנו לא שולחים credentials
    // זה יאפשר לנו לעבוד עם '*' ב-Access-Control-Allow-Origin
    fetch: (...args) => {
      const [resource, config] = args;
      const customConfig = { ...config };
      
      // בסביבת פיתוח או WebContainer, אנחנו משתמשים ב-mode: 'cors' אבל ללא credentials
      if (import.meta.env.DEV || window.location.hostname.includes('webcontainer')) {
        customConfig.mode = 'cors';
        // הסרנו את credentials: 'include'
      }
      
      return fetch(resource, customConfig);
    }
  }
});