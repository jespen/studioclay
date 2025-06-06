import { createClient } from '@supabase/supabase-js';
import { Payment, PaymentStatus } from '@/types/booking';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize Supabase client with admin privileges
// This should only be used server-side in API routes
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Test the connection
async function testConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('course_instances').select('count').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful');
    }
  } catch (err) {
    console.error('Error testing Supabase connection:', err);
  }
}

// Run the test in development
if (process.env.NODE_ENV === 'development') {
  testConnection();
}

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

export type CourseSection = {
  id: string;
  template_id: string;
  title: string;
  content: string;
  order_index: number;
  section_type: 'description' | 'schedule' | 'materials' | 'prerequisites' | 'objectives' | 'other';
  created_at: string;
  updated_at: string;
};

export type CourseMaterial = {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  provided_by_studio: boolean;
  additional_cost: number | null;
  created_at: string;
  updated_at: string;
};

export type CourseReview = {
  id: string;
  course_id: string;
  user_name: string;
  rating: number;
  review_text: string | null;
  is_verified: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseTemplate = {
  id: string;
  title: string;
  description: string | null;
  rich_description: string | null;
  short_description: string | null;
  learning_objectives: string[] | null;
  required_equipment: string[] | null;
  prerequisites: string[] | null;
  target_audience: string | null;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels' | null;
  cancellation_policy: string | null;
  additional_notes: string | null;
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
  sections?: CourseSection[];
  materials?: CourseMaterial[];
};

export type Course = {
  id: string;
  template_id: string;
  current_participants: number;
  max_participants: number;
  waitlist_capacity: number;
  current_waitlist: number;
  session_times: Array<{
    start_time: string;
    end_time: string;
    date: string;
  }> | null;
  room_details: string | null;
  specific_instructions: string | null;
  is_fully_booked: boolean;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  
  // Joined fields
  template?: CourseTemplate;
  instructor?: Instructor;
  category?: Category;
  reviews?: CourseReview[];
};

export type Booking = {
  id: string;
  course_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  number_of_participants: number;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_id?: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  
  // Invoice-specific fields
  invoice_number?: string;
  invoice_address?: string;
  invoice_postal_code?: string;
  invoice_city?: string;
  invoice_reference?: string;
  
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
  console.log('supabaseAdmin: Starting getCourses with published:', published);
  
  // First get all instances (without reviews since the table doesn't exist yet)
  const { data: instances, error: instancesError } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .order('start_date', { ascending: true });
    
  if (instancesError) {
    console.error('supabaseAdmin: Error fetching instances:', instancesError);
    throw instancesError;
  }

  console.log('supabaseAdmin: Found instances:', instances?.length || 0);
  
  if (!instances?.length) {
    console.log('supabaseAdmin: No instances found, returning empty array');
    return [];
  }

  // Get unique template IDs
  const templateIds = [...new Set(instances.map(i => i.template_id))];
  console.log('supabaseAdmin: Unique template IDs:', templateIds);

  // Then get all templates with their relationships - removed instructor relationship
  const { data: templates, error: templatesError } = await supabaseAdmin
    .from('course_templates')
    .select(`
      *,
      category:categories (*)
    `)
    .in('id', templateIds);
    
  if (templatesError) {
    console.error('supabaseAdmin: Error fetching templates:', templatesError);
    throw templatesError;
  }

  console.log('supabaseAdmin: Found templates:', templates?.length || 0);
  
  if (!templates?.length) {
    console.log('supabaseAdmin: No templates found, returning empty array');
    return [];
  }

  // Create a map of templates for easy lookup
  const templateMap = new Map(templates.map(t => [t.id, t]));

  // Process and combine the data
  const processedData = instances.map(instance => {
    const template = templateMap.get(instance.template_id);
    if (!template) {
      console.warn('supabaseAdmin: No template found for instance:', instance.id);
      return null;
    }

    // Filter based on published parameter
    if (published !== undefined) {
      if (published && !(template.is_published || template.published)) {
        console.log('supabaseAdmin: Filtering out unpublished course:', template.id);
        return null;
      }
      if (!published && (template.is_published || template.published)) {
        console.log('supabaseAdmin: Filtering out published course:', template.id);
        return null;
      }
    }

    const processedCourse = {
      ...template,
      ...instance,
      template_id: template.id,
      // Ensure we provide a price field (for backward compatibility)
      price: instance.amount || template.price,
      category: template.category || null,
      availableSpots: instance.max_participants !== null 
        ? instance.max_participants - (instance.current_participants || 0)
        : null,
      is_fully_booked: instance.current_participants >= instance.max_participants
    };

    return processedCourse;
  }).filter(Boolean);

  console.log('supabaseAdmin: Processed courses count:', processedData.length);
  if (processedData.length > 0) {
    console.log('supabaseAdmin: First processed course:', {
      id: processedData[0].id,
      title: processedData[0].title || processedData[0].categorie,
      template_id: processedData[0].template_id,
      is_published: processedData[0].is_published || processedData[0].published,
      start_date: processedData[0].start_date,
      has_rich_description: !!processedData[0].rich_description
    });
  }
  
  return processedData;
}

export async function getCourse(id: string) {
  console.log('supabaseAdmin: Getting course with id:', id);

  // First get the instance
  const { data: instance, error: instanceError } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .eq('id', id)
    .single();
    
  if (instanceError) {
    console.error('supabaseAdmin: Error fetching course instance:', instanceError);
    throw instanceError;
  }

  if (!instance) {
    console.error('supabaseAdmin: No course instance found with id:', id);
    throw new Error('Course instance not found');
  }

  console.log('supabaseAdmin: Found instance:', {
    id: instance.id,
    template_id: instance.template_id,
    max_participants: instance.max_participants,
    current_participants: instance.current_participants
  });

  // Then get the template with its relationships - removed instructor relationship
  const { data: template, error: templateError } = await supabaseAdmin
    .from('course_templates')
    .select(`
      *,
      category:categories (*)
    `)
    .eq('id', instance.template_id)
    .single();
    
  if (templateError) {
    console.error('supabaseAdmin: Error fetching course template:', templateError);
    throw templateError;
  }

  if (!template) {
    console.error('supabaseAdmin: No template found for instance:', instance.id);
    throw new Error('Course template not found');
  }

  console.log('supabaseAdmin: Found template:', {
    id: template.id,
    title: template.title || template.categorie,
    is_published: template.is_published || template.published,
    category: template.category?.name,
    has_rich_description: !!template.rich_description
  });
  
  // Process and combine the data
  const processedData = {
    ...template,
    ...instance,
    template_id: template.id,
    category: template.category || null,
    price: instance.price || template.price,
    availableSpots: instance.max_participants !== null 
      ? instance.max_participants - (instance.current_participants || 0)
      : null
  };

  console.log('supabaseAdmin: Processed course data:', {
    id: processedData.id,
    title: processedData.title,
    template_id: processedData.template_id,
    category: processedData.category?.name,
    start_date: processedData.start_date,
    max_participants: processedData.max_participants,
    current_participants: processedData.current_participants,
    availableSpots: processedData.availableSpots,
    price: processedData.price,
    has_rich_description: !!processedData.rich_description
  });
  
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
          category:categories(*)
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
      course:course_instances (
        *,
        template:course_templates (
          *,
          category:categories (*)
        )
      ),
      payment:payments (*)
    `)
    .eq('id', id)
    .single();
    
  if (error) throw error;
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

// Payment functions
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert([payment])
    .select('*, booking(*)')
    .single();
    
  if (error) throw error;
  return data as Payment;
}

export async function getPayment(id: string) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*, booking(*)')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data as Payment;
} 