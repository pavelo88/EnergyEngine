'use client';

import React from 'react';
import ReactLink from 'next/link';
import Image from 'next/image';
import { services } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export default function Services() {
  const plugin = React.useRef(
    Autoplay({ delay: 2500, stopOnInteraction: true })
  );

  return (
    <section id="servicios" className="py-24 relative z-10 overflow-hidden px-4 md:px-6">

      {/* CAPA 1: IMAGEN DE FONDO (Al fondo de todo) */}
      <Image
        src="/images/bg-industrial-section.jpg" // Asegúrate de tener esta imagen en public/images/
        alt="Background"
        fill
        className="object-cover z-[-2] pointer-events-none"
        priority
      />

      {/* CAPA 2 y 3: EL CRISTAL ÚNICO (Envuelve todo el contenido) */}
      <div className={cn(
        "max-w-7xl w-full mx-auto py-16 px-6 md:px-12 rounded-[3rem] relative z-10 transition-all duration-500 shadow-2xl",
        // Vidrio CASI TRANSPARENTE: Opacidad mínima y blur muy bajo (2px o 4px máximo)
        "bg-white/5 backdrop-blur-[2px] border border-white/10",
        "dark:bg-black/10 dark:border-white/5"
      )}>

        {/* Cabecera limpia, sin brutalismo */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-headline font-bold text-foreground tracking-tight leading-[1.2]">
            Nuestros <span className="text-primary">Servicios</span>
          </h2>
          <p className="text-muted-foreground mt-4 text-base md:text-lg leading-relaxed font-medium">
            Soluciones electromecánicas de alta precisión. Disponibilidad <span className="text-foreground font-bold">24/7/365</span>.
          </p>
        </div>

        {/* Desktop View: Grid */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* Mobile View: Carousel */}
        <div className="md:hidden">
          <Carousel
            opts={{ loop: true, align: "start" }}
            plugins={[plugin.current]}
            className="w-full"
          >
            <CarouselContent>
              {services.map((service) => (
                <CarouselItem key={service.id} className="basis-[90%] pl-4">
                  <div className="h-full py-2">
                    <ServiceCard service={service} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: any }) {
  const IconComponent = service.icon;

  return (
    <ReactLink href="/#contacto" className="group block w-full outline-none">
      <Card className={cn(
        "relative aspect-[1.08/1] overflow-hidden flex flex-col rounded-[2.5rem] transition-all duration-700 shadow-lg border-none",
        // Las tarjetas internas son casi invisibles para no tapar la imagen de la tarjeta
        "bg-transparent"
      )}>
        {/* IMAGEN DE LA CARD: Limpia */}
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover z-0 transition-transform duration-1000 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          sizes="(max-width: 768px) 100vw, 33vw"
        />

        {/* Degradado solo en la base para leer el texto blanco */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

        <div className="absolute inset-x-0 bottom-0 p-6 md:p-8 z-20 flex flex-col justify-end">
          {IconComponent && (
            <div className="mb-4 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white transition-all group-hover:bg-primary group-hover:border-primary shrink-0 shadow-sm">
              <IconComponent className="w-6 h-6" />
            </div>
          )}

          <div className="space-y-1.5">
            {/* Título de la tarjeta: Sans-serif bold, sin uppercase */}
            <h3 className="text-xl md:text-2xl font-headline font-bold text-white tracking-tight leading-none group-hover:text-primary transition-colors">
              {service.title}
            </h3>
            <p className="text-white/80 text-sm leading-relaxed line-clamp-2 font-medium">
              {service.desc}
            </p>
          </div>
        </div>
      </Card>
    </ReactLink>
  );
}