export interface CourseTemplate {
  id: string;
  title?: string;
  description?: string;
  rich_description?: string;
  duration_minutes?: number | null;
  price?: number | null;
  currency?: string | null;
  max_participants?: number | null;
  location?: string | null;
  image_url?: string | null;
  category_id: string | null;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
  instances_count?: number;
  published?: boolean | null;
  categorie?: string | null;
}

export interface CourseInstance {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  max_participants: number | null;
  current_participants: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  template_id: string | null;
  template?: Partial<CourseTemplate>;
  // Additional fields for instance-specific customization
  rich_description?: string | null;
  price?: number | null; // Price field in the database
}

// Alias for backward compatibility
export type Course = CourseInstance;

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Instructor {
  id: string;
  name: string;
}

export type Booking = {
  id: string;
  created_at: string;
  course_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  status: string;
  message: string | null;
  booking_reference: string;
  invoice_address: string | null;
  invoice_postal_code: string | null;
  invoice_city: string | null;
  invoice_reference: string | null;
  booking_date: string;
  payment_status: 'PAID' | 'CREATED' | 'DECLINED' | 'ERROR';
  // payment_id field removed as it's no longer used
};

export interface BookingHistory {
  id: string;
  original_booking_id: string;
  course_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  original_booking_date: string;
  cancellation_date: string;
  history_type: 'cancelled';
  message: string | null;
  created_at: string;
  updated_at: string;
} 