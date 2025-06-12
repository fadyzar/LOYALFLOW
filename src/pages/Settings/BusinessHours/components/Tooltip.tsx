import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap"
            style={{
              top: 'calc(100% + 5px)',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
          >
            {content}
            <div
              className="absolute w-0 h-0"
              style={{
                top: -4,
                left: '50%',
                transform: 'translateX(-50%)',
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderBottom: '4px solid #111827'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}