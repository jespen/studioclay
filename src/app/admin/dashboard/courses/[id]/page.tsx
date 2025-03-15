import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CoursePage({ params }: PageProps) {
  // Ensure params are properly awaited before using them
  const courseId = params.id;
  
  console.log('Course Edit Page: Rendering for course ID:', courseId);
  
  if (!courseId) {
    console.error('Course Edit Page: Missing course ID');
    return <div>Error: Course ID is required</div>;
  }
  
  return <CourseManagementPage courseId={courseId} />;
} 