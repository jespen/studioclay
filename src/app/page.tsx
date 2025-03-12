import Navbar from '@/components/Navbar';
import ConstructionBanner from '@/components/ConstructionBanner';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import GiftCardBanner from '@/components/GiftCardBanner';
import Portfolio from '@/components/Portfolio';
import Courses from '@/components/Courses';
import NewsletterBanner from '@/components/NewsletterBanner';
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
        <section id="courses">
          <Courses />
        </section>
        <section id="services">
          <Services />
        </section>
        <section id="presentkort">
          <GiftCardBanner />
        </section>
        <section id="works">
          <Portfolio />
        </section>
        <section id="newsletter">
          <NewsletterBanner />
        </section>
      </main>
      <Footer />
    </div>
  );
}
