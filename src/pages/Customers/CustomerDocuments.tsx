import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, FileText, Download, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import toast from 'react-hot-toast';

type Customer = Database['public']['Tables']['customers']['Row'];

function CustomerDocuments() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);

      // Load customer's documents
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);
    } catch (error: any) {
      console.error('Error loading customer:', error);
      toast.error('שגיאה בטעינת פרטי הלקוח');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      // Here we'll implement document download logic
      toast.error('הורדת מסמכים תהיה זמינה בקרוב');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('שגיאה בהורדת המסמך');
    }
  };

  const handleView = async (documentId: string) => {
    try {
      // Here we'll implement document preview logic
      toast.error('תצוגה מקדימה תהיה זמינה בקרוב');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('שגיאה בטעינת המסמך');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">לא נמצא לקוח</p>
        <Link
          to="/customers"
          className="text-indigo-600 hover:text-indigo-700"
        >
          חזרה לרשימת הלקוחות
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/customers/${customer.id}`} className="text-gray-500 hover:text-gray-700">
            <ArrowRight className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <p className="text-gray-500">{customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <nav className="flex space-x-4">
          <Link
            to={`/customers/${customer.id}`}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            פרטים
          </Link>
          <Link
            to={`/customers/${customer.id}/loyalty`}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            נאמנות
          </Link>
          <Link
            to={`/customers/${customer.id}/documents`}
            className="px-3 py-2 text-sm font-medium rounded-lg bg-indigo-50 text-indigo-600"
          >
            מסמכים
          </Link>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-6">מסמכים וחשבוניות</h2>

          <div className="space-y-4">
            {documents.length > 0 ? (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{doc.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(doc.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleView(doc.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDownload(doc.id)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">אין מסמכים זמינים</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDocuments;