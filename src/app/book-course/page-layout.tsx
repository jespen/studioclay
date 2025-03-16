import { ReactNode } from 'react';
import Footer from '@/components/Footer';

export default function BookCoursePageLayout({
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