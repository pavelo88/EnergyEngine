'use client';

import React from 'react';
import { services } from '@/lib/data';
import BlueprintBackground from './blueprint-background';

export default function Services() {
  return (
    <section id="servicios" className="py-16 scroll-mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 font-headline">
          Servicios <span className="text-primary">Especializados</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group relative flex flex-col justify-between p-8 rounded-lg bg-secondary/50 border min-h-[280px] overflow-hidden"
              >
                <BlueprintBackground type={service.title} />
                <div className="relative z-10">
                  <div className="p-3 bg-primary text-primary-foreground rounded-full w-fit mb-4">
                    <Icon />
                  </div>
                  <h3 className="text-xl font-bold uppercase mb-2 font-headline">
                    {service.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground relative z-10">
                  {service.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
