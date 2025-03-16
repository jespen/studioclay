import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

export default function BookCourseLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Since this is a server component, we can't use usePathname
  // We will rely on the nested layouts to handle the footer visibility
  
  return (
    <>
      {children}
      {/* The Footer will only be visible for the main /book-course page
          Child routes like /book-course/[id] have their own layouts that don't include the Footer */}
    </>
  );
} 