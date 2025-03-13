import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';

interface PageProps {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function CoursePage({ params }: PageProps) {
  const courseId = params.id;
  
  return <CourseManagementPage courseId={courseId} />;
} 