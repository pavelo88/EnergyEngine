'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Hero() {
  return (
    <div className="animate-fade-in text-left">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-transparent border border-primary/20 text-primary text-sm font-bold mb-6 backdrop-blur-sm">
        <ShieldCheck className="w-4 h-4" />
        <span>SERVICIO SAT 24/7 - DISPONIBILIDAD INMEDIATA</span>
      </div>
      <h1 className="text-[2.2rem] md:text-6xl font-serif font-medium leading-[1.1] mb-8 tracking-tighter text-white normal-case text-shadow-strong">
        Mantenimiento y <br />
        <span className="text-primary italic drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Reparación Industrial</span> <br />
        <span className="block mt-3 text-[38px] md:text-[55px] text-white/90 tracking-tight leading-tight text-shadow-premium">
          de Grupos Electrógenos
        </span>
      </h1>
      <p className="text-base md:text-lg text-white/90 mb-10 max-w-2xl leading-relaxed font-medium text-shadow-premium">
        Más de 20 años de experiencia en la operación electromecánica de motores diésel, gas y plantas de cogeneración. <br className='hidden md:block' /> <span className="text-white font-bold">Tu socio estratégico en eficiencia energética.</span>
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-white h-16 px-10 text-lg group font-bold rounded-huge shadow-premium transition-all border-none cursor-pointer">
          <Link href="#servicios">
            Nuestros Servicios
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="h-16 px-10 text-lg bg-white/10 backdrop-blur-md border-white/20 rounded-huge hover:bg-white/20 transition-all font-bold text-white cursor-pointer">
          <Link href="#contacto">
            Solicitar Presupuesto
          </Link>
        </Button>
      </div>
    </div>
  );
}
