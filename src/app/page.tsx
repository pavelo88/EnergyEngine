import Brands from '@/components/site/brands';
import Contact from '@/components/site/contact';
import Footer from '@/components/site/footer';
import Hero from '@/components/site/hero';
import Navbar from '@/components/site/navbar';
import Services from '@/components/site/services';
import Stats from '@/components/site/stats';
import WhatsAppWidget from '@/components/site/whatsapp-widget';

export default function Home() {
  return (
    <div className="relative text-foreground min-h-screen transition-colors duration-300">

      <Navbar />
      <main className="relative z-10 overflow-x-hidden">
        <section className="flex flex-col justify-center px-6 py-24 sm:py-40 min-h-[95vh] overflow-hidden">
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <Hero />
            <div className="w-full">
              <Stats />
            </div>
          </div>
        </section>
        <Brands />
        <Services />
        <Contact />
      </main>
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}