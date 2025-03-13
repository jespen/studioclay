import WaitlistForm from '@/components/WaitlistForm';
import styles from '@/styles/BookingForm.module.css';

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