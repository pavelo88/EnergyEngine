import Contact from '@/components/site/contact';
import Footer from '@/components/site/footer';
import Hero from '@/components/site/hero';
import Navbar from '@/components/site/navbar';
import Services from '@/components/site/services';
import Stats from '@/components/site/stats';
import WhatsAppWidget from '@/components/site/whatsapp-widget';
import Brands from '@/components/site/brands';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const bgDesktop = PlaceHolderImages.find(p => p.id === 'global-background');
  const bgMobile = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <>
      {bgDesktop && (
        <Image
          src={bgDesktop.imageUrl}
          alt={bgDesktop.description}
          fill
          className="fixed inset-0 object-cover z-[-10] opacity-15 dark:opacity-10 hidden md:block"
          data-ai-hint={bgDesktop.imageHint}
          priority
        />
      )}
      {bgMobile && (
        <Image
          src={bgMobile.imageUrl}
          alt={bgMobile.description}
          fill
          className="fixed inset-0 object-cover z-[-10] opacity-15 dark:opacity-10 md:hidden"
          data-ai-hint={bgMobile.imageHint}
          priority
        />
      )}
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
