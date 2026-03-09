'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Hero() {

  return (
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
  );
}
