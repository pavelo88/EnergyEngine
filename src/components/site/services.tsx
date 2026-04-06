'use client';

import React from 'react';
import ReactLink from 'next/link';
import Image from 'next/image';
import { Service, services } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

function ServiceCard({ service }: { service: Service }) {
  const IconComponent = service.icon;

  return (
    <Dialog>
      <div className="group block w-full outline-none">
        <DialogTrigger asChild>
          <button type="button" className="block w-full text-left">
            <Card className={cn(
              "relative overflow-hidden flex flex-col rounded-[2.5rem] transition-all duration-700 shadow-2xl border-none",
              "h-[32rem] md:h-[26rem] lg:h-[27rem] md:group-hover:h-[30rem]",
              "bg-white/10 backdrop-blur-sm border border-white/10",
              "dark:bg-slate-900/40"
            )}>
              <Image
                src={service.image}
                alt={service.title}
                fill
                className="object-cover object-center z-0 transition-all duration-1000 opacity-80 group-hover:opacity-100 md:group-hover:scale-110"
                sizes="(max-width: 768px) 100vw, 33vw"
              />

              <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

              <div className="absolute inset-x-0 bottom-0 p-8 z-20 flex flex-col justify-end">
                {IconComponent && (
                  <div className="mb-4 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white transition-all group-hover:bg-primary group-hover:border-primary">
                    <IconComponent className="w-6 h-6" />
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-xl md:text-2xl font-display font-black text-white tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed font-medium">
                    {service.desc ?? service.description}
                  </p>
                </div>
              </div>
            </Card>
          </button>
        </DialogTrigger>

      </div>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-black tracking-tight uppercase">
            {service.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {service.description}
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-52 w-full overflow-hidden rounded-2xl">
          <Image
            src={service.image}
            alt={service.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 512px"
          />
        </div>

        <CardContent className="p-0">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {service.fullDescription}
          </p>
        </CardContent>

        <DialogFooter className="sm:justify-start">
          <Button asChild className="rounded-full">
            <ReactLink href="/#contacto">Solicitar este servicio</ReactLink>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
