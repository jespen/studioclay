import WaitlistForm from '@/components/WaitlistForm';
import styles from '@/styles/BookingForm.module.css';

export function generateStaticParams() {
  // For static export, we need to provide all possible course IDs
  // Since we can't know all IDs at build time, we'll provide a few common ones
  return [
    { id: 'e5f55f82-c97e-4ef1-9ec7-8460ddd03a8a' },
    { id: 'placeholder' }
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WaitlistPage({ params }: PageProps) {
  const resolvedParams = await params;
  const courseId = resolvedParams.id;
  
  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className={styles.pageWrapper}>
        <WaitlistForm courseId={courseId} />
      </div>
    </div>
  );
} 