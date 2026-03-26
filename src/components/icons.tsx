'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { logoBase64 } from '@/lib/logo-base64';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo = ({ className, showText = true }: LogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="w-12 h-12 bg-slate-200/20 rounded-md animate-pulse" />
        {showText && (
          <div className="flex flex-col leading-none">
            <div className="h-5 w-32 bg-slate-200/20 animate-pulse rounded" />
            <div className="h-3 w-20 bg-slate-200/20 animate-pulse rounded mt-1" />
          </div>
        )}
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const logoSrc = isDark ? '/logo.png' : '/logo.png';

  return (
    <div className={cn("flex items-center gap-3 transition-all duration-500", className)}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img
          src={logoSrc}
          alt="energy engine logo"
          width={48}
          height={48}
          className="object-contain transition-opacity duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = logoBase64;
          }}
        />
      </div>
      {showText && (
        <div className="flex flex-col justify-center leading-none mt-1 font-headline">
          {/* Ahora es texto puro; el borde se aplicará automáticamente desde el CSS global */}
          <span className="text-xl md:text-2xl font-bold tracking-tight text-primary lowercase italic">
            energy engine
          </span>
          <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap">
            grupos electrogenos
          </span>
        </div>
      )}
    </div>
  );
};
