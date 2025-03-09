export interface Course {
  id: string;
  title: string;
  description: string;
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
  category?: { name: string } | null;
  instructor?: { name: string } | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Instructor {
  id: string;
  name: string;
} 