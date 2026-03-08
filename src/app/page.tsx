import Brands from '@/components/site/brands';
import Contact from '@/components/site/contact';
import Footer from '@/components/site/footer';
import Navbar from '@/components/site/navbar';
import Services from '@/components/site/services';
import WhatsAppWidget from '@/components/site/whatsapp-widget';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden pt-20">
        <Services />
        <Brands />
        <Contact />
      </main>
      <Footer />
      <WhatsAppWidget />
    </>
  );
}
