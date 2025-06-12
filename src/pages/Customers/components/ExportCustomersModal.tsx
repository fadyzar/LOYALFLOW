import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, FileSpreadsheet, File as FileCsv } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ExportCustomersModalProps {
  onClose: () => void;
  customers: any[];
}

export function ExportCustomersModal({ onClose, customers }: ExportCustomersModalProps) {
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      const data = customers.map(customer => ({
        'שם': customer.name,
        'טלפון': customer.phone,
        'אימייל': customer.email || '',
        'נקודות': customer.points,
        'יהלומים': customer.diamonds,
        'רמת נאמנות': customer.loyalty_level === 'vip' ? 'VIP' :
                      customer.loyalty_level === 'diamond' ? 'יהלום' :
                      customer.loyalty_level === 'gold' ? 'זהב' :
                      customer.loyalty_level === 'silver' ? 'כסף' : 'ברונזה',
        'ביקורים': customer.loyalty_stats.total_visits,
        'ביקור אחרון': customer.loyalty_stats.last_visit ? 
                       new Date(customer.loyalty_stats.last_visit).toLocaleDateString('he-IL') : '',
        'תאריך הצטרפות': new Date(customer.created_at).toLocaleDateString('he-IL')
      }));

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data, { header: Object.keys(data[0]) });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customers');
        XLSX.writeFile(wb, `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        const csv = Papa.unparse(data);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting customers:', error);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Download className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">ייצוא לקוחות</h2>
                <p className="text-sm text-gray-500">
                  {customers.length} לקוחות
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">בחר פורמט</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat('xlsx')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  format === 'xlsx'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className={`h-5 w-5 ${
                  format === 'xlsx' ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <span className="text-sm">Excel</span>
              </button>

              <button
                onClick={() => setFormat('csv')}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  format === 'csv'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileCsv className={`h-5 w-5 ${
                  format === 'csv' ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <span className="text-sm">CSV</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">שדות לייצוא</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• שם</li>
              <li>• טלפון</li>
              <li>• אימייל</li>
              <li>• נקודות ויהלומים</li>
              <li>• רמת נאמנות</li>
              <li>• היסטוריית ביקורים</li>
              <li>• תאריך הצטרפות</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>מייצא...</span>
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                <span>ייצא לקוחות</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}