'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import Stats from './stats';

export default function Hero() {
  return (
    <section className={cn(
    )}>

      {/* CAPA 3: EL CRISTAL ÚNICO - Transparencia real con blur mínimo */}
      <div className={cn(
        "max-w-7xl w-full mx-auto p-8 md:p-16 rounded-[4rem] border relative z-10 transition-all duration-500 shadow-premium",
        // Vidrio ultra transparente (1% y 2%) con blur casi imperceptible para que se vea el fondo
        "bg-white/[0.01] backdrop-blur-[2px] border-white/10 shadow-xl",
        "dark:bg-slate-950/[0.02] dark:border-white/5 dark:backdrop-blur-[2px]"
      )}>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* LADO IZQUIERDO: TEXTOS */}
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-display font-black mb-8 bg-primary/10 border-primary/20 text-primary uppercase tracking-[0.3em]">
              <Activity size={14} />
              Servicio SAT 24/7 - Disponibilidad Inmediata
            </div>

            {/* Títulos ajustados: Sin text-balance para que no se rompan las líneas */}
            <h1 className="text-5xl md:text-7xl lg:text-[5.2rem] font-display font-black mb-6 tracking-tighter leading-[1] text-slate-950 dark:text-white uppercase text-shadow-premium">
              <span className="block">Mantenimiento y</span>
              <span className="text-primary italic block">Reparación Industrial</span>
              <span className="text-slate-950 dark:text-white text-2xl md:text-4xl lg:text-5xl block mt-4 leading-none">de Grupos Electrógenos</span>
            </h1>

            <p className="text-base md:text-lg font-sans max-w-xl mb-10 leading-relaxed font-bold text-slate-600 dark:text-white/70">
              Más de 20 años de experiencia en la operación electromecánica de motores diésel, gas y plantas de cogeneración. <br />
              <span className="text-slate-900 dark:text-white font-black uppercase text-sm tracking-widest text-shadow-strong">Tu socio estratégico en eficiencia energética.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <Button asChild size="lg" className="h-16 px-10 text-[11px] font-display font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 transition-transform active:scale-95 group">
                <Link href="#servicios" className="flex items-center gap-2">
                  Nuestros Servicios <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-16 px-10 text-[11px] font-display font-black uppercase tracking-widest border-2 border-slate-200 dark:border-foreground/20 hover:bg-white/5 text-slate-700 dark:text-foreground rounded-2xl transition-all">
                <Link href="#contacto">Solicitar Cotización</Link>
              </Button>
            </div>
          </div>

          <div className="w-full">
            <Stats />
          </div>

        </div>
      </div>
    </section>
  );
}