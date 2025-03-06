import BookCourse from '@/components/BookCourse';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Book a Clay Course | Studio Clay',
  description: 'Book a pottery or clay working course at Studio Clay. Learn from experienced instructors in a creative environment.',
};

export default function BookCoursePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <BookCourse />
      </main>
      <Footer />
    </div>
  );
} 