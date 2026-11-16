import type { Metadata } from 'next';
import AdminThemeProvider from '@/components/admin/AdminThemeProvider';

export const metadata: Metadata = {
  title: 'Admin - Studio Clay',
  description: 'Admin portal for Studio Clay',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
} 