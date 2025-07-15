import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, FileSpreadsheet, File } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';

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
    { name: 'ישראל ישראלי', phone: '0501234567', email: 'israel@example.com' },
    { name: 'שרה כהן', phone: '0502345678', email: 'sarah@example.com' }
  ];

  const downloadExampleExcel = () => {
    const data = generateExampleData();
    const ws = XLSX.utils.json_to_sheet(data, { header: ['name', 'phone', 'email'], skipHeader: true });
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
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
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
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
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

  const importCustomers = async () => {
    if (!file) {
      toast.error('נא לבחור קובץ לייבוא');
      return;
    }
    setImporting(true);
    try {
      let customers: any[] = [];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null });

        customers = rawData.map((row: any) => ({
          name: row.name ?? row['שם'] ?? null,
          phone: row.phone ?? row['טלפון'] ?? null,
          email: row.email ?? row['אימייל'] ?? null
        }));
      }

      const normalized = customers.map(c => ({
        name: c.name ?? null,
        phone: c.phone ? String(c.phone).replace(/\s+/g, '') : null,
        email: c.email ?? null,
        business_id: businessId
      }));

      if (normalized.length === 0) {
        toast.error('לא נמצאו לקוחות בקובץ');
        setImporting(false);
        return;
      }

      // סינון כפילויות טלפון בקובץ עצמו
      const seenPhones = new Set<string>();
      const uniqueNormalized = normalized.filter(c => {
        if (!c.phone) return false;
        if (seenPhones.has(c.phone)) return false;
        seenPhones.add(c.phone);
        return true;
      });

      if (uniqueNormalized.length < normalized.length) {
        toast(`${normalized.length - uniqueNormalized.length} כפילויות טלפון בקובץ לא יובאו`);
      }

      // בדיקת טלפונים כפולים במסד הנתונים
      const phones = uniqueNormalized.map(c => c.phone).filter(Boolean);
      const { data: existingCustomers, error: existingError } = await supabase
        .from('customers')
        .select('phone')
        .in('phone', phones)
        .eq('business_id', businessId);

      if (existingError) {
        toast.error('שגיאה בבדיקת כפילויות');
        setImporting(false);
        return;
      }

      const existingPhones = (existingCustomers ?? []).map(c => c.phone);
      const filtered = uniqueNormalized.filter(c => c.phone && !existingPhones.includes(c.phone));

      if (filtered.length === 0) {
        toast.error('כל הלקוחות בקובץ כבר קיימים לפי טלפון');
        setImporting(false);
        return;
      }

      if (filtered.length < uniqueNormalized.length) {
        toast(
          `${uniqueNormalized.length - filtered.length} לקוחות לא יובאו כי הטלפון שלהם כבר קיים במערכת`
        );
      }

      // בדיקת תגובת OPTIONS ל-Edge Function (debug CORS)
      try {
        const optionsRes = await fetch('https://nkuqcyelxgyihrxyvitb.supabase.co/functions/v1/import_customers', {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('OPTIONS status:', optionsRes.status, 'headers:', Object.fromEntries(optionsRes.headers.entries()));
      } catch (optionsErr) {
        console.error('OPTIONS request error:', optionsErr);
      }
      console.log('🧪 normalized:', normalized);
      console.log('📦 JSON to send:', JSON.stringify({ customers: normalized }));

      // קריאה לפונקציה בפועל
      const response = await fetch('https://nkuqcyelxgyihrxyvitb.supabase.co/functions/v1/import_customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ customers: filtered })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Import Error:', errorData);
        toast.error(`שגיאה בייבוא: ${response.status} ${response.statusText}`);
        return;
      }

      toast.success('הייבוא הסתיים בהצלחה!');
      // גם אם יש שגיאה ב-onImportComplete, הייבוא ל-Supabase הצליח כי הפונקציה בשרת פועלת.
      // השגיאה היא רק ב-client (בדף) ולא משפיעה על הייבוא עצמו.
      if (typeof onImportComplete === 'function') {
        try {
          onImportComplete();
        } catch (err) {
          // טיפול בשגיאה מקומית כדי שלא תפריע לזרימת הייבוא
          console.error('onImportComplete error:', err);
        }
      }
      onClose();
    } catch (err: any) {
      toast.error('שגיאה בייבוא הקובץ');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Upload className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold">ייבוא לקוחות</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
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
                <File className="h-5 w-5 text-blue-600" />
                <span className="text-sm">CSV דוגמה</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={importCustomers}
            className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!file || importing}
          >
            <Upload className="h-5 w-5" />
            <span>ייבא לקוחות</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
