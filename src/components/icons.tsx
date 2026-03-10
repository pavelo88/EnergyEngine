'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { logoBase64 } from '@/lib/logo-base64';

export const Logo = () => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 h-[48px]">
        <div className="w-12 h-12 bg-slate-200 rounded-md animate-pulse" />
        <div className="flex flex-col leading-tight">
          <span className="font-headline text-xl font-bold tracking-tighter text-slate-300">energy engine</span>
          <span className="text-[10px] font-medium text-slate-300 -mt-0.5 uppercase">Grupos Electrógenos</span>
        </div>
      </div>
    );
  }

  // Lógica de logo según el tema
  // logo.png para modo claro, logo2.png para modo oscuro
  const isDark = resolvedTheme === 'dark';
  const logoSrc = isDark ? '/logo2.png' : '/logo.png';

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <Image 
          src={logoError ? logoBase64 : logoSrc} 
          alt="Energy Engine Logo" 
          width={48} 
          height={48} 
          className="object-contain"
          onError={() => setLogoError(true)}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-headline text-xl font-black tracking-tighter text-primary italic">energy engine</span>
        <span className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase">Grupos Electrógenos</span>
      </div>
    </div>
  );
};
