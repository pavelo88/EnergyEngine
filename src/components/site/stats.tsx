'use client';

import React from 'react';
import { History, Clock, Globe, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Stats() {
  const stats = [
    { label: 'Años', value: '20+', desc: 'Experiencia en el Sector', icon: <History className="w-5 h-5" /> },
    { label: 'Días', value: '365', desc: 'Asistencia SAT Inmediata', icon: <Clock className="w-5 h-5" /> },
    { label: 'Total', value: 'Cobertura', desc: 'Península, Islas y Portugal', icon: <Globe className="w-5 h-5" /> },
    { label: 'Soporte', value: '24/7', desc: 'Servicio de Emergencia', icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-5xl mx-auto p-2">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={cn(
            "p-3 md:p-6 rounded-[1.2rem] md:rounded-[2rem] border shadow-lg flex flex-col items-center justify-center text-center bg-white/70 backdrop-blur-sm dark:bg-black/40 dark:border-white/10"
          )}
        >
          {/* Icono pequeño y centrado */}
          <div className="bg-white dark:bg-black/50 p-2 md:p-3 rounded-xl text-primary mb-2 md:mb-4 border border-primary/10">
            {stat.icon}
          </div>

          <div className="flex flex-col items-center w-full">
            <span className={cn(
              "font-headline font-black tracking-tighter leading-none text-slate-900 dark:text-white",
              stat.value.length > 5 ? "text-lg md:text-3xl" : "text-xl md:text-4xl"
            )}>
              {stat.value}
            </span>
            <span className="text-[7px] md:text-xs font-black text-primary uppercase tracking-widest mt-1">
              {stat.label}
            </span>
          </div>

          <p className="text-[9px] md:text-sm text-slate-600 dark:text-slate-400 font-medium mt-2 leading-tight max-w-[120px] md:max-w-full">
            {stat.desc}
          </p>
        </div>
      ))}
    </div>
  );
}