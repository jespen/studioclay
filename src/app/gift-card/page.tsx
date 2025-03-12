import GiftCard from '@/components/GiftCard';
import ConstructionBanner from '@/components/ConstructionBanner';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Presentkort | Studio Clay',
  description: 'Köp ett presentkort för keramikkurser, workshops eller studiotid på Studio Clay. Den perfekta gåvan för kreativa individer.',
};

export default function GiftCardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <ConstructionBanner />
      <main className="flex-grow">
        <GiftCard />
      </main>
      <Footer />
    </div>
  );
} 