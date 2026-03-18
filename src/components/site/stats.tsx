'use client';

import React from 'react';
import { History, Clock, Globe, Zap } from 'lucide-react';

export default function Stats() {
  const stats = [
    { label: 'Años', value: '20+', desc: 'Experiencia en el Sector', icon: <History className="w-5 h-5" /> },
    { label: 'Días', value: '365', desc: 'Asistencia SAT Inmediata', icon: <Clock className="w-5 h-5" /> },
    { label: 'Cobertura', value: 'Iberia', desc: 'Península, Islas y Portugal', icon: <Globe className="w-5 h-5" /> },
    { label: 'Soporte', value: '24/7', desc: 'Servicio de Emergencia', icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`
            py-4 md:py-6 px-6 md:px-10 rounded-huge glass-card
            hover:scale-[1.02] hover:border-primary/40 transition-all duration-500
            animate-float group cursor-default flex flex-col items-center justify-center text-center
            border-slate-200/50 dark:border-white/10
          `}
          style={{
            animationDelay: `${idx * 0.3}s`,
            animationDuration: '6s'
          }}
        >
          <div className="bg-primary/10 p-2 md:p-2.5 rounded-xl text-primary w-fit mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-500 mx-auto border border-primary/20">
            {stat.icon}
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-2xl md:text-4xl font-serif font-medium tracking-tight text-slate-950 dark:text-white leading-none">
              {stat.value}
            </span>
            <span className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-[0.2em] leading-none mt-1">
              {stat.label}
            </span>
          </div>
          <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 leading-tight mt-2 font-medium italic max-w-[150px]">
            {stat.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
