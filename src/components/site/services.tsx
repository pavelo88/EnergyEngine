'use client';

import React from 'react';
import Image from 'next/image';
import { services } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import BlueprintBackground from './blueprint-background';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useScreenSize } from '@/hooks/use-screen-size';

export default function Services() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const screenSize = useScreenSize();

  React.useEffect(() => {
    if (!api) {
      return;
    }
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(300px,_1fr)] lg:auto-rows-[25vh] gap-6 p-4">
      {services.map((service, i) => {
        const Icon = service.icon;
        const image = PlaceHolderImages.find(img => img.id === service.imgId);
        let itemSpan = '';
        switch (i) {
          case 0:
            itemSpan = 'lg:col-span-2 lg:row-span-2';
            break;
          case 3:
            itemSpan = 'md:col-span-2 lg:col-span-2';
            break;
          default:
            itemSpan = '';
            break;
        }

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            viewport={{ once: true, amount: 0.2 }}
            className={cn('w-full h-full', itemSpan)}
          >
            <div className="h-full relative rounded-lg overflow-hidden group border">
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
              <BlueprintBackground type={service.bpType} />
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between z-10 text-white">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary text-primary-foreground rounded-2xl">
                    <Icon size={24} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl lg:text-3xl font-black uppercase mb-2 group-hover:text-primary transition-colors font-headline">
                    {service.title}
                  </h3>
                  <p className="text-sm text-zinc-300 max-w-sm">
                    {service.desc}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );

  const renderCarousel = () => (
    <Carousel
      setApi={setApi}
      opts={{
        align: 'center',
        loop: true,
      }}
      plugins={[
        Autoplay({
          delay: 3000,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        }),
      ]}
      className="w-full"
    >
      <CarouselContent>
        {services.map((service, i) => {
          const Icon = service.icon;
          const image = PlaceHolderImages.find(img => img.id === service.imgId);
          return (
            <CarouselItem key={i} className="basis-[90%] md:basis-1/2 lg:basis-[40%]">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true, amount: 0.2 }}
                className={cn("p-4 transition-transform duration-500", current === i ? 'scale-100' : 'scale-90 opacity-60')}
              >
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
                  <BlueprintBackground type={service.bpType} />
                  <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between z-10 text-white">
                    <div className="flex justify-between items-start">
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
              </motion.div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );

  return (
    <section id="servicios" className="py-16 bg-secondary/50 dark:bg-white/[0.02] border-y overflow-hidden scroll-mt-10">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 font-headline">
            Servicios <span className="text-primary">Especializados</span>
          </h2>
        </div>
        {screenSize === 'mobile' ? renderCarousel() : renderGrid()}
      </div>
    </section>
  );
}
