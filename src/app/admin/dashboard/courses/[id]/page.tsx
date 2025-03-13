import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';

export function generateStaticParams() {
  // This is a placeholder function to satisfy static export requirements
  // In a real app, you would generate all possible parameter values
  return [{ id: 'placeholder' }];
}

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