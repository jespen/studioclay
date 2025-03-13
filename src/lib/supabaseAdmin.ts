import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with admin privileges
// This should only be used server-side in API routes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export { supabaseAdmin };

// Course types
export type Category = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type Instructor = {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseTemplate = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_minutes: number | null;
  price: number;
  currency: string;
  max_participants: number | null;
  current_participants: number;
  location: string | null;
  image_url: string | null;
  category_id: string | null;
  instructor_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  category?: Category;
  instructor?: Instructor;
};

export type Course = {
  id: string;
  template_id: string;
  current_participants: number;
  max_participants: number;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  
  // Joined fields
  template?: CourseTemplate;
  instructor?: Instructor;
  category?: Category;
};

export type Booking = {
  id: string;
  course_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  booking_date: string;
  status: 'waiting' | 'confirmed' | 'cancelled';
  payment_status: 'paid' | 'unpaid';
  message: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  course?: Course;
};

// API functions for server components and API routes

// Categories
export async function getCategories() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data as Category[];
}

// Instructors
export async function getInstructors() {
  const { data, error } = await supabaseAdmin
    .from('instructors')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data as Instructor[];
}

// Courses
export async function getCourses({ published }: { published?: boolean | undefined } = {}) {
  const query = supabaseAdmin
    .from('course_instances')
    .select(`
      *,
      template:course_templates(
        *,
        category:categories(*),
        instructor:instructors(*)
      )
    `)
    .order('start_date');
    
  // Only filter by is_published if the published parameter is explicitly set
  if (published !== undefined) {
    query.eq('is_published', published);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Process instances to include template data
  const processedData = (data || []).map(instance => ({
    ...instance,
    ...instance.template,
    template_id: instance.template?.id,
    availableSpots: instance.max_participants !== null 
      ? instance.max_participants - (instance.current_participants || 0)
      : null
  }));
  
  return processedData;
}

export async function getCourse(id: string) {
  const { data, error } = await supabaseAdmin
    .from('course_instances')
    .select(`
      *,
      template:course_templates(
        *,
        category:categories(*),
        instructor:instructors(*)
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Process instance to include template data
  const processedData = {
    ...data,
    ...data.template,
    template_id: data.template?.id,
    availableSpots: data.max_participants !== null 
      ? data.max_participants - (data.current_participants || 0)
      : null
  };
  
  return processedData;
}

// Bookings
export async function createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(booking)
    .select()
    .single();
    
  if (error) throw error;
  return data as Booking;
}

export async function getBookings() {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      course:course_instances(
        *,
        template:course_templates(
          *,
          category:categories(*),
          instructor:instructors(*)
        )
      )
    `)
    .order('booking_date', { ascending: false });
    
  if (error) throw error;
  
  // Process the data to maintain backward compatibility
  const processedData = (data || []).map(booking => {
    if (booking.course) {
      booking.course = {
        ...booking.course,
        ...booking.course.template,
        template_id: booking.course.template?.id
      };
    }
    return booking;
  });
  
  return processedData as Booking[];
}

export async function getBooking(id: string) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      *,
      course:course_instances(
        *,
        template:course_templates(
          *,
          category:categories(*),
          instructor:instructors(*)
        )
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
  
  // Process the data to maintain backward compatibility
  if (data.course) {
    data.course = {
      ...data.course,
      ...data.course.template,
      template_id: data.course.template?.id
    };
  }
  
  return data as Booking;
}

export async function updateBookingStatus(id: string, status: Booking['status']) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Booking;
}

export async function updatePaymentStatus(id: string, payment_status: Booking['payment_status']) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ payment_status })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data as Booking;
} 