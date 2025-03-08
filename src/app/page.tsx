import Navbar from '@/components/Navbar';
import ConstructionBanner from '@/components/ConstructionBanner';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import Portfolio from '@/components/Portfolio';
import Pricing from '@/components/Pricing';
import Kontakt from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ConstructionBanner />
      <main className="flex-grow pt-[110px]">
        <section id="home">
          <Hero />
        </section>
        <section id="services">
          <Services />
        </section>
        <section id="works">
          <Portfolio />
        </section>
        <section id="pricing">
          <Pricing />
        </section>
        <section id="kontakt">
          <Kontakt />
        </section>
      </main>
      <Footer />
    </div>
  );
}
