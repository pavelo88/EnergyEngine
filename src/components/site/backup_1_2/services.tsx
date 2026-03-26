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
    <section id="servicios" className="py-24 relative z-10 overflow-hidden">

      {/* CAPA 2: EL CRISTAL / PELÍCULA (Encima de la imagen, debajo de las cards) */}
      <div className={cn(
        "absolute inset-0 z-[-1] pointer-events-none transition-all duration-500",
        // MODO CLARO: Vidrio blanco ultra transparente
        "bg-white/5 backdrop-blur-[2px]",
        // MODO OSCURO: Película negra ligerísima
        "dark:bg-black/20 dark:backdrop-blur-none"
      )} />

      <div className="max-w-[1260px] mx-auto px-6 md:px-12 relative z-10">
        {/* Cabecera con tipografía cuadrada técnica */}
        <div className="text-center mb-20">
          <h2 className="text-center text-[2.2rem] md:text-5xl font-display font-black mb-8 text-slate-950 dark:text-white leading-[1.1] tracking-tighter uppercase">
            Nuestros <span className="text-primary">Servicios</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-bold">
            Soluciones electromecánicas de alta precisión. Disponibilidad <span className="text-slate-900 dark:text-white font-black">24/7/365</span>.
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
        "relative aspect-[1.08/1] overflow-hidden flex flex-col rounded-[2.5rem] transition-all duration-700 shadow-2xl border-none",
        "bg-white/10 backdrop-blur-sm border border-white/10", // Card casi invisible
        "dark:bg-slate-900/40"
      )}>
        {/* IMAGEN DE LA CARD: Limpia, sin película oscura */}
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover z-0 transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100"
          sizes="(max-width: 768px) 100vw, 33vw"
        />

        {/* Solo degradado en la base para que se lea el texto */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10" />

        <div className="absolute inset-x-0 bottom-0 p-8 z-20 flex flex-col justify-end">
          {IconComponent && (
            <div className="mb-4 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white transition-all group-hover:bg-primary group-hover:border-primary">
              <IconComponent className="w-6 h-6" />
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-display font-black text-white tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">
              {service.title}
            </h3>
            <p className="text-white/70 text-xs md:text-sm leading-relaxed line-clamp-2 font-medium">
              {service.desc}
            </p>
          </div>
        </div>
      </Card>
    </ReactLink>
  );
}