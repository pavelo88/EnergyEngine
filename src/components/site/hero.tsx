'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Stats from './stats';

export default function Hero() {
  return (
    <section className="relative min-h-[95vh] flex flex-col justify-center pt-32 pb-16 sm:pb-20 px-4 md:px-6 z-10 overflow-hidden">

      {/* Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob dark:hidden" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 dark:hidden" />
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000 dark:hidden" />

      {/* CONTENEDOR PRINCIPAL HÍBRIDO */}
      <div className={cn(
        "max-w-7xl w-full mx-auto p-5 sm:p-8 md:p-12 lg:p-16 rounded-3xl sm:rounded-[3rem] relative z-10 transition-all duration-700 shadow-2xl overflow-hidden",
        /* Estilos MODO CLARO: Cristal más blanco y opaco para que las letras oscuras resalten perfecto */
        "bg-white/50 backdrop-blur-xl border border-white/50",
        /* Estilos MODO OSCURO: Transparencia alta y muy poco blur, como pediste */
        "dark:bg-black/10 dark:backdrop-blur-[2px] dark:border-white/5"
      )}>

        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-60 pointer-events-none dark:hidden" />

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center relative z-20">

          {/* LADO IZQUIERDO: TEXTOS */}
          <div className="flex flex-col items-start text-left font-body">

            <div className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-widest mb-6 sm:mb-10 bg-primary/10 border-primary/30 text-primary backdrop-blur-md shadow-inner transition-transform hover:scale-105">
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" />
              Servicio SAT 24/7
            </div>

            <h1 className="text-[2.5rem] sm:text-4xl md:text-5xl lg:text-[4rem] font-headline font-black mb-4 sm:mb-6 tracking-tighter leading-[1.05] text-slate-900 dark:text-white drop-shadow-sm">
              <span className="block opacity-90">Potencia que</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 block mt-1">
                nunca se detiene
              </span>
            </h1>

            {/* CONTRASTE ALTO AQUÍ: Cambiado de text-slate-600 a text-slate-800 */}
            <h2 className="text-lg sm:text-2xl lg:text-3xl block font-bold text-slate-800 dark:text-slate-200 leading-snug mb-4 sm:mb-8 max-w-xl">
              Especialistas en la ingeniería y <span className="text-slate-950 dark:text-white">reparación industrial</span> de grupos electrógenos.
            </h2>

            {/* CONTRASTE ALTO AQUÍ: Cambiado a text-slate-900 y font-semibold para lectura impecable */}
            <p className="text-sm sm:text-lg max-w-xl mb-8 sm:mb-12 leading-relaxed font-semibold text-slate-900 dark:text-slate-300">
              Más de 20 años asegurando la continuidad operativa del sector industrial, marítimo y energético. Optimizamos su infraestructura bajo los más estrictos estándares.
            </p>

            {/* BOTONES: Ahora son flex-col en móviles para no salirse de la pantalla */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-10 text-sm sm:text-base font-black uppercase tracking-widest rounded-2xl shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.7)] hover:scale-105 active:scale-95 transition-all group bg-primary text-primary-foreground border border-primary/50 relative overflow-hidden">
                <Link href="#servicios" className="flex items-center justify-center gap-3">
                  <span className="relative z-10 flex items-center gap-2">Explorar Servicios <ArrowRight size={18} className="transition-transform group-hover:translate-x-2" /></span>
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-14 sm:h-16 px-6 sm:px-10 text-sm sm:text-base font-black uppercase tracking-widest rounded-2xl border-slate-400/50 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/5 transition-all bg-white/60 dark:bg-black/10 backdrop-blur-md text-slate-900 dark:text-white hover:scale-105 active:scale-95 group">
                <Link href="#contacto" className="flex items-center justify-center gap-2">
                  <Zap size={18} className="text-amber-500 group-hover:scale-110 transition-transform" /> Contactar
                </Link>
              </Button>
            </div>
          </div>

          <div className="w-full relative mt-8 lg:mt-0">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent rounded-[3rem] blur-2xl -z-10 dark:opacity-20" />
            <Stats />
          </div>

        </div>
      </div>
    </section>
  );
}