import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Bell } from 'lucide-react';
import { useAuth } from '../../../contexts/auth/hooks';  // Updated import

interface HeaderProps {
  onNotificationsClick: () => void;
}

export function Header({ onNotificationsClick }: HeaderProps) {
  const { business, user } = useAuth();
  const today = new Date();

  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
              {business?.name || user?.email?.split('@')[0] || 'אורח'}
            </h1>
            <p className="text-sm text-gray-500">
              {today.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNotificationsClick}
          className="relative p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-600"
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white" />
        </motion.button>
      </div>
    </motion.div>
  );
}