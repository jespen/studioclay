import { Suspense } from 'react';
import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

async function getInitialData(courseId: string) {
  // Fetch course data
  const { data: courseData, error: courseError } = await supabaseAdmin
    .from('course_instances')
    .select('*')
    .eq('id', courseId)
    .single();

  if (courseError) {
    console.error('Error fetching course:', courseError);
    throw courseError;
  }

  const templateQuery = courseData.template_id
    ? supabaseAdmin
        .from('course_templates')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('id', courseData.template_id)
        .single()
    : Promise.resolve({ data: null, error: null });

  const bookingsQuery = supabaseAdmin
    .from('bookings')
    .select(`
      *,
      payments (
        id,
        status,
        payment_reference,
        payment_method
      )
    `)
    .eq('course_id', courseId);

  const [{ data: templateData, error: templateError }, { data: bookings, error: bookingsError }] = await Promise.all([
    templateQuery,
    bookingsQuery,
  ]);

  if (templateError) {
    console.error('Error fetching template:', templateError);
    throw templateError;
  }

  if (templateData) {
    courseData.template = templateData;
  }

  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError);
    throw bookingsError;
  }

  return {
    course: courseData,
    bookings: bookings || []
  };
}

export default async function CoursePage({ params }: PageProps) {
  // Ensure params are properly awaited
  const { id: courseId } = await Promise.resolve(params);
  
  console.log('Course Edit Page: Rendering for course ID:', courseId);
  
  if (!courseId) {
    console.error('Course Edit Page: Missing course ID');
    return <div>Error: Course ID is required</div>;
  }

  const initialData = await getInitialData(courseId);
  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CourseManagementPage 
        courseId={courseId} 
        initialCourse={initialData.course}
        initialBookings={initialData.bookings}
      />
    </Suspense>
  );
} 