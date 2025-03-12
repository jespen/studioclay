import { ReactNode } from 'react';
import Footer from '@/components/Footer';

export default function BookCourseLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
} 