export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  isNew: boolean;
  description: string;
  discount: number | null;
  inStock?: boolean;
  stockQuantity?: number;
  published?: boolean;
} 