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
    /* CAMBIO CLAVE: 
      Agregamos 'bg-background' y 'text-foreground'. 
      Esto hace que el fondo cambie al azul oscuro que tienes en globals.css 
      cuando el modo oscuro está activo.
    */
    <div className="bg-transparent text-foreground min-h-screen transition-colors duration-300">
      <Navbar />
      <main className="overflow-x-hidden">
        <section className="flex flex-col justify-center px-6 py-16 sm:py-20 min-h-screen overflow-hidden">
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
    </div>
  );
}