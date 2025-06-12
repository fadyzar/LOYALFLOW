export interface ProductPromotion {
  is_active: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date?: string;
  end_date?: string;
}

export interface Product {
  id: string;
  name_he: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock_quantity: number;
  min_stock_quantity: number;
  image_url?: string;
  description?: string;
  promotion?: ProductPromotion;
  created_at: string;
}

export interface ProductFormData {
  name_he: string;
  sku: string;
  barcode: string;
  price: string;
  stock_quantity: string;
  min_stock_quantity: string;
  image?: File | null;
  description?: string;
  promotion?: ProductPromotion;
}