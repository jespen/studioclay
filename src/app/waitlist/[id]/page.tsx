import WaitlistForm from '@/components/WaitlistForm';
import styles from '@/styles/BookingForm.module.css';

export default async function WaitlistPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen pt-[120px] pb-16">
      <div className={styles.pageWrapper}>
        <WaitlistForm courseId={params.id} />
      </div>
    </div>
  );
} 