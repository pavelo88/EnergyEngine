<<<<<<< HEAD
=======
import Brands from '@/components/site/brands';
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
import Contact from '@/components/site/contact';
import Footer from '@/components/site/footer';
import Hero from '@/components/site/hero';
import Navbar from '@/components/site/navbar';
import Services from '@/components/site/services';
<<<<<<< HEAD
import Stats from '@/components/site/stats';
import WhatsAppWidget from '@/components/site/whatsapp-widget';
import Brands from '@/components/site/brands';
=======
import WhatsAppWidget from '@/components/site/whatsapp-widget';
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

export default function Home() {
  return (
    <>
      <Navbar />
<<<<<<< HEAD
      <main className="overflow-x-hidden">
        <section className="flex flex-col justify-center px-6 py-16 sm:py-20 min-h-screen overflow-hidden">
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Hero />
            <Stats />
          </div>
        </section>
=======
      <main className="overflow-x-hidden pt-20">
        <Hero />
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        <Brands />
        <Services />
        <Contact />
      </main>
      <Footer />
      <WhatsAppWidget />
    </>
  );
}
