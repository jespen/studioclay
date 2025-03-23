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

  // Fetch template data if we have a template_id
  if (courseData.template_id) {
    const { data: templateData, error: templateError } = await supabaseAdmin
      .from('course_templates')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('id', courseData.template_id)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw templateError;
    }

    courseData.template = templateData;
  }

  // Fetch bookings data
  const { data: bookings, error: bookingsError } = await supabaseAdmin
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