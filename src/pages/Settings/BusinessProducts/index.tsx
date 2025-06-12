import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { Product, ProductFormData } from './types';
import { validateProductForm } from './validation';
import { ProductForm } from './components/ProductForm';
import { ProductCard } from './components/ProductCard';
import toast from 'react-hot-toast';

const defaultFormData: ProductFormData = {
  name_he: '',
  sku: '',
  barcode: '',
  price: '',
  stock_quantity: '0',
  min_stock_quantity: '0',
  image: null,
  description: '',
  promotion: undefined
};

function BusinessProducts() {
  const { user, business, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);

  useEffect(() => {
    const loadProducts = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        let businessId = business?.id;
        if (!businessId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          businessId = userData?.business_id;
        }

        if (!businessId) {
          throw new Error('לא נמצא עסק מקושר');
        }

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at');

        if (error) throw error;
        setProducts(data || []);
      } catch (error: any) {
        console.error('Error loading products:', error);
        toast.error('שגיאה בטעינת המוצרים');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [user?.id, business?.id, authLoading]);

  const uploadImage = async (file: File, businessId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
      const filePath = `${businessId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('שגיאה בהעלאת התמונה');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name_he: product.name_he,
      sku: product.sku || '',
      barcode: product.barcode || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_stock_quantity: product.min_stock_quantity.toString(),
      description: product.description || '',
      promotion: product.promotion
      // לא מאתחלים את שדה התמונה בכלל כשעורכים מוצר קיים
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const validationError = validateProductForm(formData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      let businessId = business?.id;
      
      if (!businessId) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user?.id)
          .single();

        if (userError) throw new Error('לא נמצא עסק מקושר');
        businessId = userData?.business_id;
      }

      if (!businessId) {
        throw new Error('לא נמצא עסק מקושר');
      }

      let imageUrl = editingProduct?.image_url;

      // טיפול בתמונה רק אם יש שינוי בשדה התמונה
      if ('image' in formData) {
        // אם ביקשנו במפורש למחוק את התמונה
        if (formData.image === null) {
          if (editingProduct?.image_url) {
            const oldPath = editingProduct.image_url.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from('products')
                .remove([`${businessId}/${oldPath}`]);
            }
          }
          imageUrl = null;
        }
        // אם יש תמונה חדשה להעלות
        else if (formData.image instanceof File) {
          // מחיקת התמונה הקיימת אם יש
          if (editingProduct?.image_url) {
            const oldPath = editingProduct.image_url.split('/').pop();
            if (oldPath) {
              await supabase.storage
                .from('products')
                .remove([`${businessId}/${oldPath}`]);
            }
          }
          // העלאת התמונה החדשה
          imageUrl = await uploadImage(formData.image, businessId);
        }
      }

      const productData = {
        business_id: businessId,
        name_he: formData.name_he,
        name: formData.name_he,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        min_stock_quantity: parseInt(formData.min_stock_quantity),
        image_url: imageUrl,
        description: formData.description,
        promotion: formData.promotion
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('המוצר עודכן בהצלחה');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast.success('המוצר נוסף בהצלחה');
      }

      setShowForm(false);
      setEditingProduct(null);
      setFormData(defaultFormData);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || (editingProduct ? 'שגיאה בעדכון המוצר' : 'שגיאה בהוספת המוצר'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המוצר?')) return;

    try {
      const product = products.find(p => p.id === id);
      
      if (product?.image_url) {
        const businessId = business?.id;
        const oldPath = product.image_url.split('/').pop();
        if (businessId && oldPath) {
          await supabase.storage
            .from('products')
            .remove([`${businessId}/${oldPath}`]);
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('המוצר נמחק בהצלחה');
      
      const { data, error: loadError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business?.id)
        .order('created_at');

      if (loadError) throw loadError;
      setProducts(data || []);
    } catch (error) {
      toast.error('שגיאה במחיקת המוצר');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center pb-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold">מוצרים</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingProduct(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            מוצר חדש
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <ProductForm
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(null);
              setFormData(defaultFormData);
            }}
            isEditing={!!editingProduct}
            existingImageUrl={editingProduct?.image_url}
          />
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {products.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-gray-500">לא נמצאו מוצרים</p>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData(defaultFormData);
              setShowForm(true);
            }}
            className="mt-4 text-indigo-600 hover:text-indigo-700"
          >
            הוסף מוצר חדש
          </button>
        </div>
      )}
    </div>
  );
}

export default BusinessProducts;