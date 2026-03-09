'use client';

import React from 'react';
import Image from 'next/image';
import { services } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
<<<<<<< HEAD
import { Card, CardContent } from '@/components/ui/card';
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

export default function Services() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
<<<<<<< HEAD
    <section id="servicios" className="py-16 scroll-mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 font-headline">
          Nuestros <span className="text-primary">Servicios</span>
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            Ofrecemos un abanico de soluciones de ingeniería para garantizar la continuidad y eficiencia de sus operaciones críticas.
        </p>
=======
    <section id="servicios" className="py-16 bg-secondary/50 dark:bg-white/[0.02] border-y overflow-hidden scroll-mt-10">
      <div className="max-w-6xl mx-auto">
      <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 font-headline">
            Servicios <span className="text-primary">Especializados</span>
          </h2>
        </div>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        <Carousel
          setApi={setApi}
          opts={{
            align: 'center',
            loop: true,
          }}
          plugins={[
            Autoplay({
<<<<<<< HEAD
              delay: 5000,
              stopOnInteraction: true,
=======
              delay: 3000,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
            }),
          ]}
          className="w-full"
        >
<<<<<<< HEAD
          <CarouselContent className="-ml-4">
=======
          <CarouselContent>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
            {services.map((service, i) => {
              const Icon = service.icon;
              const image = PlaceHolderImages.find(img => img.id === service.imgId);
              return (
<<<<<<< HEAD
                <CarouselItem key={i} className="pl-4 md:basis-1/2 lg:basis-1/3">
                  <div className={cn("p-1 transition-transform duration-300", current === i ? "scale-100" : "scale-90 opacity-70")}>
                    <Card className="overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="aspect-video relative">
                          {image && (
                            <Image
                              src={image.imageUrl}
                              alt={service.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              data-ai-hint={image.imageHint}
                            />
                          )}
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-primary/10 text-primary rounded-lg">
                                    <Icon size={24} />
                                </div>
                                <h3 className="text-lg font-bold font-headline leading-tight">
                                    {service.title}
                                </h3>
                            </div>
                            <p className="text-sm text-muted-foreground min-h-[40px]">
                                {service.desc}
                            </p>
                        </div>
                      </CardContent>
                    </Card>
=======
                <CarouselItem key={i} className="basis-[90%] md:basis-1/2 lg:basis-[40%]">
                  <div className={cn("p-4 transition-transform duration-500", current === i ? 'scale-100' : 'scale-90 opacity-60')}>
                    <div className="h-[55vh] relative rounded-lg overflow-hidden group border">
                      {image && (
                        <Image
                          src={image.imageUrl}
                          alt={service.title}
                          fill
                          className="object-cover transition-transform duration-1000 group-hover:scale-110"
                          data-ai-hint={image.imageHint}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                      <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between z-10 text-white">
                        <div className="flex justify-between items-start">
                        
                          {/* <span className="text-6xl font-bold opacity-20">{service.id}</span> */}
                          <div className="p-4 bg-primary text-primary-foreground rounded-2xl">
                            <Icon size={32} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-black uppercase mb-4 group-hover:text-primary transition-colors font-headline">
                            {service.title}
                          </h3>
                          <p className="text-sm text-zinc-300 max-w-sm">
                            {service.desc}
                          </p>
                        </div>
                      </div>
                    </div>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
<<<<<<< HEAD
           <div className="flex justify-center gap-2 mt-8">
            {services.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  current === index ? "w-4 bg-primary" : "bg-primary/20"
                )}
              />
            ))}
          </div>
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        </Carousel>
      </div>
    </section>
  );
}
