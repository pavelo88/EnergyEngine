'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import logoLight from '@/app/logo.png';
import logoDark from '@/app/logo2.jpg';

export const Logo = () => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 h-[48px]">
        <div className="w-12 h-12 bg-secondary rounded-md" />
        <div className="flex flex-col leading-tight">
          <span className="font-headline text-xl font-bold tracking-tighter text-transparent">energy engine</span>
          <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">GRUPOS ELECTROGENOS</span>
        </div>
      </div>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const logoSrc = currentTheme === 'dark' ? logoDark : logoLight;

  return (
    <div className="flex items-center gap-3">
      <Image src={logoSrc} alt="Energy Engine Logo" width={48} height={48} />
      <div className="flex flex-col leading-tight">
        <span className="font-headline text-xl font-bold tracking-tighter text-primary">energy engine</span>
        <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">GRUPOS ELECTROGENOS</span>
      </div>
    </div>
  );
};
