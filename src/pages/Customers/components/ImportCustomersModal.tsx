import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileSpreadsheet, File as FileCsv } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface ImportCustomersModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  businessId: string;
}

export function ImportCustomersModal({ onClose, onImportComplete, businessId }: ImportCustomersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateExampleData = () => [
    {
      name: 'ישראל ישראלי',
      phone: '0501234567',
      email: 'israel@example.com'
    },
    {
      name: 'שרה כהן',
      phone: '0502345678',
      email: 'sarah@example.com'
    }
  ];

  const downloadExampleExcel = () => {
    const data = generateExampleData();
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ['name', 'phone', 'email'],
      skipHeader: true
    });
    
    XLSX.utils.sheet_add_aoa(ws, [['שם', 'טלפון', 'אימייל']], { origin: 'A1' });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers_example.xlsx');
  };

  const downloadExampleCsv = () => {
    const data = generateExampleData();
    const csv = Papa.unparse({
      fields: ['שם', 'טלפון', 'אימייל'],
      data: data.map(row => [row.name, row.phone, row.email])
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'customers_example.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error('נא להעלות קובץ Excel או CSV בלבד');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 5MB');
      return;
    }

    setFile(file);
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Upload className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold">ייבוא לקוחות</h2>
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
          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.csv"
              onChange={handleFileSelect}
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className="mx-auto w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                <Upload className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {file ? file.name : 'גרור קובץ לכאן או לחץ לבחירה'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Excel או CSV, עד 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Example Files */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">קבצים לדוגמה:</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={downloadExampleExcel}
                className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="text-sm">Excel דוגמה</span>
              </button>
              
              <button
                onClick={downloadExampleCsv}
                className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                <FileCsv className="h-5 w-5 text-blue-600" />
                <span className="text-sm">CSV דוגמה</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            <span>ייבא לקוחות</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}