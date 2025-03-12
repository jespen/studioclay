import BookCourse from '@/components/BookCourse';

export const metadata = {
  title: 'Boka en Keramikkurs | Studio Clay',
  description: 'Boka en keramikkurs hos Studio Clay. Lär dig från erfarna instruktörer i en kreativ miljö.',
};

export default function BookCoursePage() {
  return (
    <div className="hide-navigation">
      <main className="flex-grow">
        <BookCourse />
      </main>
    </div>
  );
} 