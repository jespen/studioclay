export interface CourseTemplate {
  id: string;
  title: string;
  description: string;
  duration_minutes: number | null;
  price: number;
  currency: string;
  max_participants: number | null;
  location: string | null;
  image_url: string | null;
  category_id: string | null;
  instructor_id: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  category?: { name: string } | null;
  instructor?: { name: string } | null;
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