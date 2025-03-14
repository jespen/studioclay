import BookingForm from '@/components/BookingForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookCoursePage({ params }: PageProps) {
  const resolvedParams = await params;
  const courseId = resolvedParams.id;
  
  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className="container mx-auto px-4">
        <BookingForm courseId={courseId} />
      </div>
    </div>
  );
} 