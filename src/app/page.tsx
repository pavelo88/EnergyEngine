import Contact from '@/components/site/contact';
import Footer from '@/components/site/footer';
import Hero from '@/components/site/hero';
import Navbar from '@/components/site/navbar';
import Services from '@/components/site/services';
import Stats from '@/components/site/stats';
import WhatsAppWidget from '@/components/site/whatsapp-widget';
import Brands from '@/components/site/brands';
import Image from 'next/image';
import fondo from './fondo.jpg';
import fondo2 from './fondo2.jpg';

export default function Home() {
  return (
    <>
      <Image
        src={fondo}
        alt="Fondo de escritorio de Energy Engine"
        fill
        className="fixed inset-0 object-cover -z-10 opacity-15 hidden md:block"
        priority
      />
      <Image
        src={fondo2}
        alt="Fondo móvil de Energy Engine"
        fill
        className="fixed inset-0 object-cover -z-10 opacity-15 md:hidden"
        priority
      />
      <Navbar />
      <main className="overflow-x-hidden pt-20">
        <section className="flex flex-col justify-center px-6 py-16 sm:py-20 overflow-hidden">
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Hero />
            <Stats />
          </div>
        </section>
        <Brands />
        <Services />
        <Contact />
      </main>
      <Footer />
      <WhatsAppWidget />
    </>
  );
}
