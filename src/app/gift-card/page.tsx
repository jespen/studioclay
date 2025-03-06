import GiftCard from '@/components/GiftCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Gift Cards | Studio Clay',
  description: 'Purchase a gift card for pottery classes, workshops, or studio time at Studio Clay. The perfect gift for creative individuals.',
};

export default function GiftCardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <GiftCard />
      </main>
      <Footer />
    </div>
  );
} 