import type { Metadata } from 'next';

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-section">
      {children}
    </div>
  );
} 