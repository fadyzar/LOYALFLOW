export interface ServicePromotion {
  is_active: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date?: string;
  end_date?: string;
}

export interface Service {
  id: string;
  name_he: string;
  price: number;
  duration: string;
  image?: File | null;
  image_url?: string;
  description?: string;
  promotion?: ServicePromotion;
  created_at: string;
}

export interface ServiceFormData {
  name_he: string;
  price: string;
  duration: string;
  image?: File | null;
  description?: string;
  promotion?: ServicePromotion;
}