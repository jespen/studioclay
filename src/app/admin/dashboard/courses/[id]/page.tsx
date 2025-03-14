import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CoursePage({ params }: PageProps) {
  const resolvedParams = await params;
  const courseId = resolvedParams.id;
  
  return <CourseManagementPage courseId={courseId} />;
} 