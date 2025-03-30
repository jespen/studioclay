/**
 * Type definitions for the shop system
 */

// Shop product interface
export interface ShopProduct {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  stock_quantity: number;
  image: string;
  status: string;
  category: string;
  is_published: boolean;
}

// Shop order interface
export interface ShopOrder {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  order_reference: string;
  invoice_number: string | null;
  unit_price: number;
  total_price: number;
  currency: string;
  product?: {
    title: string;
    image: string;
  };
} 