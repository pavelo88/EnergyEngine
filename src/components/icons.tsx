'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { logoBase64 } from '@/lib/logo-base64';

export const Logo = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Renderizado neutro para evitar errores de hidratación (Hydration Mismatch)
  if (!mounted) {
    return (
      <div className="flex items-center gap-3 h-[48px]">
        <div className="w-12 h-12 bg-slate-200/20 rounded-md animate-pulse" />
        <div className="flex flex-col leading-none">
          <span className="font-headline text-xl font-black tracking-tighter text-slate-300 italic">energy engine</span>
          <span className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase">GRUPOS ELECTRÓGENOS</span>
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  // Cambiamos a <img> estándar con un sistema de fallback robusto
  const logoSrc = isDark ? '/logo2.png' : '/logo.png';

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img 
          src={logoSrc} 
          alt="Energy Engine Logo" 
          width={48} 
          height={48} 
          className="object-contain transition-opacity duration-300"
          onError={(e) => {
            // Si la imagen física no existe, usamos el base64 de seguridad
            (e.target as HTMLImageElement).src = logoBase64;
          }}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-headline text-xl font-black tracking-tighter text-primary italic">energy engine</span>
        <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase">GRUPOS ELECTRÓGENOS</span>
      </div>
    </div>
  );
};
