'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { stats } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Hero() {

  return (
    <section className="relative flex flex-col justify-center px-6 py-16 sm:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary py-1 px-4 text-[10px] font-black uppercase tracking-widest mb-6"
            >
              Misión Crítica Garantizada
            </Badge>
          </div>
          <h1 
            className="text-5xl md:text-6xl font-black uppercase leading-[0.85] tracking-tighter mb-8 font-headline text-foreground"
          >
            energía <br /> <span className="text-primary">imparable</span>
          </h1>
          <p 
            className="text-lg text-muted-foreground mb-8 max-w-md text-balance"
          >
            Especialistas en mantenimiento industrial para infraestructuras de
            alta exigencia: Aeropuertos y Hospitales.
          </p>
          <div>
            <Button asChild size="lg" className="px-10 py-7 bg-primary text-primary-foreground rounded-full font-black uppercase tracking-widest text-xs group hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
              <Link href="#contacto">
                Contactar Ingeniería
                <ArrowRight className="size-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          {stats.map((m, i) => (
            <div
              key={i}
              className="bg-card p-6 rounded-2xl border flex flex-col items-center justify-center text-center aspect-square"
            >
              <div className="text-primary mb-4">
                <m.icon className="size-7" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold mb-1 tracking-tighter text-foreground">
                {m.val}
              </div>
              <div className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">
                {m.tag}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
