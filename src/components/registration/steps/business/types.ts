export interface Service {
  id?: string;
  name: string;
  name_he: string;
  price: string;
  duration: string;
  description?: string;
  promotion?: {
    is_active: boolean;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    start_date?: string;
    end_date?: string;
  };
}