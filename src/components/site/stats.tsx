'use client';

import React from 'react';
import { History, Clock, Globe, Zap } from 'lucide-react';

export default function Stats() {
  const stats = [
    { label: 'Años', value: '20+', desc: 'Experiencia en el Sector', icon: <History className="w-6 h-6 md:w-7 md:h-7" /> },
    { label: 'Días', value: '365', desc: 'Asistencia SAT Inmediata', icon: <Clock className="w-6 h-6 md:w-7 md:h-7" /> },
    { label: 'Cobertura', value: 'Iberia', desc: 'Península, Islas y Portugal', icon: <Globe className="w-6 h-6 md:w-7 md:h-7" /> },
    { label: 'Soporte', value: '24/7', desc: 'Servicio de Emergencia', icon: <Zap className="w-6 h-6 md:w-7 md:h-7" /> },
  ];

  return (
    // Grid fijo de 2 columnas para lograr "2 arriba y 2 abajo" en cualquier pantalla
    <div className="grid grid-cols-2 gap-6 font-body">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="p-6 md:p-8 rounded-[2rem] bg-white/10 dark:bg-black/20 backdrop-blur-lg border border-white/20 dark:border-white/5 shadow-xl hover:-translate-y-2 hover:border-primary/50 transition-all duration-500 group flex flex-col items-center justify-center text-center"
        >
          {/* Contenedor del ícono: Relleno suave, efecto hover que invierte colores */}
          <div className="bg-primary/10 p-4 rounded-2xl text-primary mb-5 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm shrink-0 border border-primary/20">
            {stat.icon}
          </div>

          <div className="flex flex-col items-center gap-1">
            {/* Números: Sans-serif (font-headline o bold), grandes y legibles */}
            <span className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-foreground leading-none">
              {stat.value}
            </span>

            {/* Etiqueta: Tamaño normal (text-sm), tracking elegante */}
            <span className="text-xs md:text-sm font-bold text-primary uppercase tracking-wider mt-2">
              {stat.label}
            </span>
          </div>

          {/* Descripción: Legible, color tenue (muted-foreground) */}
          <p className="text-sm text-muted-foreground font-medium mt-3 leading-relaxed max-w-[200px]">
            {stat.desc}
          </p>
        </div>
      ))}
    </div>
  );
}