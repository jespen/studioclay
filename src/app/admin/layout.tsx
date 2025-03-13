import type { Metadata } from 'next';
import { generateStaticParams } from './static';

export const metadata: Metadata = {
  title: 'Admin - Studio Clay',
  description: 'Admin portal for Studio Clay',
  robots: {
    index: false,
    follow: false,
  },
};

export { generateStaticParams };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 