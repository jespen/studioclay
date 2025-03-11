import BookingForm from '@/components/BookingForm';

export default async function BookCoursePage({ params }: { params: { id: string } }) {
  // Properly await and extract the ID parameter in Next.js 13+
  const courseId = await Promise.resolve(params.id);
  
  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className="container mx-auto px-4">
        <BookingForm courseId={courseId} />
      </div>
    </div>
  );
} 