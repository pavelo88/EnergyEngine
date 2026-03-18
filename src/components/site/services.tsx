'use client';

import React from 'react';
import ReactLink from 'next/link';
import Image from 'next/image';
import { services } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export default function Services() {
  const plugin = React.useRef(
    // Automatizado a 2.5 segundos (2500ms) y que se detiene al presionar sobre la tarjeta
    Autoplay({ delay: 2500, stopOnInteraction: true })
  );

  return (
    <section id="servicios" className="py-24 relative z-10 glass-section">
      <div className="max-w-[1260px] mx-auto px-6 md:px-12">
        {/* Cabecera de la Sección (Identidad de 'energy engine' y verde teal) */}
        <div className="text-center mb-24">
          <h2 className="text-center text-[2.2rem] md:text-5xl font-serif font-medium mb-8 text-slate-950 dark:text-white leading-[1.1] tracking-tight">
            Nuestros <span className="text-primary italic">Servicios</span>
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-medium">
            Soluciones electromecánicas integrales de alta precisión. Disponibilidad inmediata <span className="text-slate-900 dark:text-white font-bold">24/7/365</span> con cobertura total en España y Portugal.
          </p>
        </div>

        {/* Desktop View: Grid 3x3 para 9 servicios simétricos */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {/* Mobile View: Carousel (Automatizado, sin botones) */}
        <div className="md:hidden">
          <Carousel
            opts={{ loop: true, align: "start" }}
            plugins={[plugin.current]}
            className="w-full"
          >
            <CarouselContent>
              {services.map((service) => (
                <CarouselItem key={service.id} className="basis-full pl-4">
                  <div className="h-full py-2">
                    <ServiceCard service={service} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {/* Los botones CarouselPrevious y CarouselNext han sido eliminados de la vista móvil */}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: any }) {
  const IconComponent = service.icon;

  return (
    <ReactLink
      href={`/#contacto`}
      className="group block w-full outline-none"
    >
    <Card className="relative aspect-[1.08/1] border border-slate-200/50 dark:border-white/10 overflow-hidden flex flex-col rounded-[2.5rem] group bg-white dark:bg-slate-900 shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-primary/5">
        {/* Full background Image */}
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover z-0 transition-transform duration-1000 ease-in-out group-hover:scale-110 opacity-90 group-hover:opacity-100"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Smooth Bottom Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent z-10 opacity-95 transition-opacity duration-700" />

        {/* Content Layer */}
        <div className="absolute inset-x-0 bottom-0 p-10 z-20 flex flex-col justify-end">
          {/* Icon Box */}
          {IconComponent && (
            <div className="mb-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white transition-all duration-500 shadow-2xl group-hover:bg-primary group-hover:border-primary group-hover:scale-110">
              <IconComponent className="w-6 h-6" strokeWidth={1.5} />
            </div>
          )}

          {/* Texts */}
          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-headline font-bold text-white tracking-tight leading-none group-hover:text-primary transition-colors">
              {service.title}
            </h3>
            <p className="text-white/70 text-xs md:text-sm leading-relaxed line-clamp-2 max-w-[90%] font-medium">
              {service.desc}
            </p>
          </div>
        </div>

        {/* Subtle Shine/Reflect effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-30 pointer-events-none" />
      </Card>
    </ReactLink>
  );
}