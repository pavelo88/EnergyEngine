'use client';

import React from 'react';
import { services } from '@/lib/data';

export default function Services() {
  return (
    <section id="servicios" className="py-16 scroll-mt-10">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-center text-4xl md:text-5xl font-black uppercase tracking-tighter mb-10 font-headline">
          Servicios <span className="text-primary">Especializados</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => {
            const Icon = service.icon;
            let gridClasses = '';
            switch (i) {
              case 0:
                gridClasses = 'lg:col-span-2 lg:row-span-2';
                break;
              case 1:
                gridClasses = 'lg:col-span-1';
                break;
              case 2:
                gridClasses = 'lg:col-span-1';
                break;
              case 3:
                gridClasses = 'lg:col-span-2';
                break;
              default:
                break;
            }

            return (
              <div
                key={service.id}
                className={`group relative flex flex-col justify-between p-8 rounded-3xl bg-slate-900 text-white min-h-[280px] ${gridClasses}`}
              >
                <div>
                  <div className="p-3 bg-primary text-primary-foreground rounded-2xl w-fit mb-4">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-3xl font-black uppercase mb-2 font-headline">
                    {service.title}
                  </h3>
                </div>
                <p className="text-sm text-zinc-300 max-w-sm">
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
