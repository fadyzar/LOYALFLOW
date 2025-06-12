import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Copy, ExternalLink, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface BookingLinkProps {
  bookingLink: string;
  businessId: string;
  onBookingLinkChange: (link: string) => void;
}

export function BookingLink({ bookingLink, businessId, onBookingLinkChange }: BookingLinkProps) {
  // קבלת הדומיין מהסביבה
  const domain = window.location.host;
  const protocol = window.location.protocol;
  const fullUrl = `${protocol}//${domain}/book/${bookingLink}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    // בדיקת תקינות הקישור
    if (!/^[a-z0-9-]*$/.test(value)) {
      toast.error('הקישור יכול להכיל רק אותיות באנגלית קטנות, מספרים ומקפים');
      return;
    }
    onBookingLinkChange(value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    toast.success('הקישור הועתק ללוח');
  };

  const handleOpen = () => {
    window.open(fullUrl, '_blank');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          <span>קישור להזמנת תורים</span>
        </div>
      </label>

      <div className="bg-gray-50 p-4 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1 bg-white p-2 rounded-lg border border-gray-200">
            <input
              type="text"
              value={bookingLink}
              onChange={handleChange}
              className="flex-1 outline-none text-gray-900 min-w-0"
              placeholder="my-business"
              dir="ltr"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200"
          >
            <Copy className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleOpen}
            className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-200"
          >
            <ExternalLink className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            זהו הקישור שדרכו לקוחות יוכלו לקבוע תורים באופן מקוון
          </p>
          <Link 
            to="/settings/external-page"
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Palette className="h-4 w-4" />
            <span>עצב דף</span>
          </Link>
        </div>
      </div>
    </div>
  );
}