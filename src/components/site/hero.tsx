'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import Stats from './stats';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center pt-24 pb-20 px-4 md:px-6 z-10">

      <div className={cn(
        "max-w-7xl w-full mx-auto p-8 md:p-12 lg:p-16 rounded-[3rem] relative z-10 transition-all duration-500",
        "bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/5 shadow-2xl"
      )}>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* LADO IZQUIERDO: TEXTOS */}
          <div className="flex flex-col items-start text-left font-body">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold mb-8 bg-primary/10 border-primary/20 text-primary">
              <Activity size={16} />
              Servicio SAT 24/7 - Disponibilidad Inmediata
            </div>

            {/* TÍTULO PRINCIPAL: Tamaños reducidos para que respire mejor */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-headline font-bold mb-6 tracking-tight leading-[1.1] text-slate-900 dark:text-white">
              <span className="block">Mantenimiento y</span>
              <span className="text-primary block">Reparación Industrial</span>

              {/* SUBTÍTULO: Tamaño más pequeño y color MUCHO más oscuro en modo claro */}
              <span className="text-2xl md:text-3xl lg:text-3xl block mt-3 font-semibold text-slate-700 dark:text-slate-200">
                de Grupos Electrógenos
              </span>
            </h1>

            {/* PÁRRAFO: Color oscuro y fuerte en modo claro (slate-800) para máxima legibilidad */}
            <p className="text-base md:text-lg max-w-xl mb-10 leading-relaxed font-medium text-slate-800 dark:text-slate-200">
              Más de 20 años de experiencia en la operación electromecánica de motores diésel, gas y plantas de cogeneración. <br className="hidden sm:block" />
              <span className="text-slate-950 dark:text-white font-bold mt-2 block">
                Tu socio estratégico en eficiencia energética.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
              <Button asChild size="lg" className="h-14 px-8 text-base font-bold rounded-xl shadow-lg hover:shadow-primary/25 transition-all group">
                <Link href="#servicios" className="flex items-center gap-2">
                  Nuestros Servicios <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              {/* BOTÓN SECUNDARIO: Fondo un poco más visible y texto oscuro en modo claro */}
              <Button asChild variant="outline" size="lg" className="h-14 px-8 text-base font-bold rounded-xl border-slate-300 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-all bg-white/30 dark:bg-black/10 backdrop-blur-sm text-slate-900 dark:text-white">
                <Link href="#contacto">Solicitar Cotización</Link>
              </Button>
            </div>
          </div>

          {/* LADO DERECHO: ESTADÍSTICAS */}
          <div className="w-full">
            <Stats />
          </div>

        </div>
      </div>
    </section>
  );
}