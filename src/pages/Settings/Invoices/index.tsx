import React, { useState, useEffect } from 'react';
import { ArrowRight, FileText, Save, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/auth/hooks';
import CryptoJS from 'crypto-js';

const DEFAULT_SHOP_NUMBER = '001';
// NOTE: Server-side encryption is now used instead of client-side
// const ENCRYPTION_KEY = 'change-this-key-in-production';

export default function Invoices() {
  const { user } = useAuth();
  const business_id = user?.user_metadata?.business_id || null;

  const [form, setForm] = useState({
    terminal_name: '',
    is_active: true,
    enable_invoice: false,
    pelecard_terminal_number: '',
    pelecard_user: '',
    pelecard_password: '',
    pelecard_shop_number: DEFAULT_SHOP_NUMBER,
    sandbox_mode: false, // ברירת מחדל - סביבת ייצור
  });
  const [loading, setLoading] = useState(false);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loadingTerminals, setLoadingTerminals] = useState(false);
  const [editTerminal, setEditTerminal] = useState<any | null>(null); // null = add, object = edit
  const [showForm, setShowForm] = useState(false);

  // Fetch terminals on mount
  useEffect(() => {
    const fetchTerminals = async () => {
      if (!business_id) return;
      setLoadingTerminals(true);
      const { data, error } = await supabase
        .from('payment_terminals')
        .select('*')
        .eq('business_id', business_id)
        .order('created_at', { ascending: false });
      if (error) toast.error('שגיאה בטעינת מסופים: ' + error.message);
      setTerminals(data || []);
      setLoadingTerminals(false);
    };
    fetchTerminals();
  }, [business_id, loading]); // נטען מחדש גם אחרי שמירה

  // Populate form for editing
  const handleEdit = (terminal: any) => {
    setForm({
      terminal_name: terminal.terminal_name || '',
      is_active: terminal.is_active ?? true,
      enable_invoice: terminal.enable_invoice ?? false,
      pelecard_terminal_number: terminal.pelecard_terminal_number || '',
      pelecard_user: terminal.pelecard_user || '',
      pelecard_password: '', // לא נטען סיסמה מוצפנת
      pelecard_shop_number: terminal.pelecard_shop_number || DEFAULT_SHOP_NUMBER,
      sandbox_mode: terminal.sandbox_mode ?? false, // ברירת מחדל - סביבת ייצור אם לא מוגדר אחרת
    });
    setEditTerminal(terminal);
    setShowForm(true);
  };

  // Start add new
  const handleAddNew = () => {
    setForm({
      terminal_name: '',
      is_active: true,
      enable_invoice: false,
      pelecard_terminal_number: '',
      pelecard_user: '',
      pelecard_password: '',
      pelecard_shop_number: DEFAULT_SHOP_NUMBER,
      sandbox_mode: false, // ברירת מחדל - סביבת ייצור
    });
    setEditTerminal(null);
    setShowForm(true);
  };

  // Cancel form
  const handleCancel = () => {
    setShowForm(false);
    setEditTerminal(null);
  };

  // Validation
  const validate = () => {
    if (!form.terminal_name) return 'יש להזין שם למסוף';
    if (form.enable_invoice) {
      if (!form.pelecard_terminal_number) return 'נדרש מספר מסוף פלאכארד';
      if (!form.pelecard_user) return 'נדרש שם משתמש פלאכארד';
      // בדיקת סיסמה רק אם זה מסוף חדש או שהסיסמה שונתה
      if (!editTerminal || form.pelecard_password) {
        if (!form.pelecard_password) return 'נדרשת סיסמת פלאכארד';
      }
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }
    setLoading(true);
    if (!business_id) {
      toast.error('לא נמצא מזהה עסק (business_id) במשתמש');
      setLoading(false);
      return;
    }

    try {
      // בניית האובייקט לשמירה
      const terminalData: any = {
        ...form,
        business_id,
      };

      // טיפול בסיסמה
      if (editTerminal && !form.pelecard_password) {
        // אם מעדכנים מסוף קיים והמשתמש לא הכניס סיסמה חדשה, לא לשנות את הסיסמה הקיימת
        delete terminalData.pelecard_password;
      } else if (form.pelecard_password) {
        // אם יש סיסמה - שלח ל-Edge Function להצפנה
        try {
          const response = await fetch('https://nkuqcyelxgyihrxyvitb.supabase.co/functions/v1/encrypt-password', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
            },
            body: JSON.stringify({ plaintext: form.pelecard_password }),
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'שגיאה בהצפנת סיסמה');
          }
          
          // שמירת הסיסמה המוצפנת שהתקבלה מה-Edge Function
          terminalData.pelecard_password = result.encrypted;
        } catch (encryptError: any) {
          console.error('שגיאה בהצפנת סיסמה:', encryptError);
          throw new Error('שגיאה בהצפנת סיסמה: ' + encryptError.message);
        }
      }

      // אם עורכים מסוף קיים, שמירת המזהה שלו
      if (editTerminal) {
        terminalData.id = editTerminal.id;
      }

      const { error } = await supabase.from('payment_terminals').upsert([terminalData]);

      if (error) throw new Error(error.message);
      
      toast.success('המסוף נשמר בהצלחה');
      setShowForm(false);
    } catch (error: any) {
      toast.error('שגיאה בשמירת המסוף: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mobile-friendly toggle
  const Toggle = ({ checked, onChange, label, name }: { checked: boolean; onChange: any; label: string; name: string }) => (
    <label className="flex items-center justify-between w-full py-2 cursor-pointer select-none">
      <span className="text-base font-medium text-gray-700">{label}</span>
      <span className={`relative inline-block w-11 h-6 transition rounded-full ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}>
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}></span>
      </span>
    </label>
  );

  return (
    <div className="space-y-6 pb-24 max-w-md mx-auto px-2 sm:px-0">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex flex-col gap-4 py-3">
          {/* Title */}
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold">סליקה וחשבוניות</h1>
            </div>
          </div>
        </div>
      </div>
      {/* Subtitle & explanation */}
      <div className="bg-indigo-50 rounded-xl p-4 text-indigo-800 text-sm shadow mb-2">
        כאן ניתן להגדיר מסוף סליקה בענן (פלאכארד) לעסק שלך. כל התקשורת מתבצעת ישירות מול API של פלאכארד בענן. יש למלא את כל השדות הנדרשים ולשמור.
      </div>
      {/* List of terminals */}
      <div className="bg-white rounded-2xl shadow p-4 border border-gray-100 mb-2">
        <div className="font-bold text-gray-700 mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-500" />
          מסופים קיימים
        </div>
        <button
          type="button"
          className="mb-3 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors w-full"
          onClick={handleAddNew}
        >
          הוסף מסוף חדש
        </button>
        {loadingTerminals ? (
          <div className="text-center text-gray-400 py-4">טוען מסופים...</div>
        ) : terminals.length === 0 ? (
          <div className="text-center text-gray-400 py-4">לא נמצאו מסופים לעסק זה</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {terminals.map((t) => (
              <li key={t.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{t.terminal_name}</span>
                  <span className="flex items-center gap-2">
                    {t.is_active ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                    {t.enable_invoice && <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-2 py-0.5">חשבוניות</span>}
                    {t.sandbox_mode && <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-0.5">סביבת פיתוח</span>}
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-indigo-50 transition"
                      onClick={() => handleEdit(t)}
                      aria-label="ערוך מסוף"
                    >
                      <Edit className="h-5 w-5 text-indigo-500" />
                    </button>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>מספר מסוף: {t.pelecard_terminal_number || '-'}</span>
                  <span>חנות: {t.pelecard_shop_number || '-'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-4 space-y-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg text-gray-800">
              {editTerminal ? 'עריכת מסוף' : 'הוספת מסוף חדש'}
            </span>
            <button
              type="button"
              className="text-gray-500 hover:text-red-500 font-bold"
              onClick={handleCancel}
            >
              ביטול
            </button>
          </div>
          <div>
            <label className="block font-medium mb-1 text-gray-700">שם פנימי למסוף</label>
            <input
              type="text"
              name="terminal_name"
              value={form.terminal_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition"
              required
              autoComplete="off"
            />
          </div>
          <Toggle
            checked={form.is_active}
            onChange={handleChange}
            label="האם המסוף פעיל במערכת"
            name="is_active"
          />
          <Toggle
            checked={form.enable_invoice}
            onChange={handleChange}
            label="האם נדרש להפיק חשבוניות"
            name="enable_invoice"
          />
          <Toggle
            checked={form.sandbox_mode}
            onChange={handleChange}
            label="סביבת פיתוח (סנדבוקס)"
            name="sandbox_mode"
          />
          {form.enable_invoice && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">מספר מסוף פלאכארד</label>
                <input
                  type="text"
                  name="pelecard_terminal_number"
                  value={form.pelecard_terminal_number}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition"
                  required={form.enable_invoice}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">שם משתמש פלאכארד</label>
                <input
                  type="text"
                  name="pelecard_user"
                  value={form.pelecard_user}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition"
                  required={form.enable_invoice}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block font-medium mb-1 text-gray-700">
                  {editTerminal ? 'סיסמת פלאכארד (השאר ריק לשמירת הסיסמה הקיימת)' : 'סיסמת פלאכארד'}
                </label>
                <input
                  type="password"
                  name="pelecard_password"
                  value={form.pelecard_password}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition"
                  required={form.enable_invoice && !editTerminal}
                  autoComplete="off"
                />
                {editTerminal && (
                  <p className="text-xs text-gray-500 mt-1">
                    * אם אינך רוצה לשנות את הסיסמה, השאר שדה זה ריק
                  </p>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block font-medium mb-1 text-gray-700">מספר חנות פלאכארד</label>
            <input
              type="text"
              name="pelecard_shop_number"
              value={form.pelecard_shop_number}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="001"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-700 active:scale-95 transition-colors disabled:opacity-50 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                שמור
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
} 