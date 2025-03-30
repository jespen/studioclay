/**
 * Type definitions for courses and bookings
 */

// Course interface
export interface Course {
  id: string;
  title: string;
  description?: string;
  rich_description?: string;
  price: number;
  start_date: string;
  end_date?: string;
  duration_minutes?: number;
  location?: string;
  max_participants: number;
  current_participants: number;
  availableSpots?: number;
  is_published: boolean;
  template_id?: string;
  category?: string | {
    id: string;
    name: string;
    description?: string;
  };
  instructor?: string | {
    id: string;
    name: string;
    email?: string;
  };
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Booking interface
export interface Booking {
  id: string;
  course_id: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
  participants: number;
  booking_reference: string;
  status: string;
  invoice_number?: string;
  special_requirements?: string;
  created_at: string;
  updated_at?: string;
  payments?: Payment[];
  course?: Course;
}

// Payment interface
export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  payment_reference?: string;
  created_at: string;
  updated_at?: string;
} 