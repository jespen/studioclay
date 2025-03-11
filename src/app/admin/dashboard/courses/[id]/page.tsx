import CourseManagementPage from '@/components/admin/Courses/CourseManagementPage';

export default async function CoursePage({ params }: { params: { id: string } }) {
  // Properly await and extract the ID parameter in Next.js 13+
  const courseId = await Promise.resolve(params.id);
  
  return <CourseManagementPage courseId={courseId} />;
} 