'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import logoLight from '@/app/logo.png';
import logoDark from '@/app/logo2.jpg';

export const Logo = () => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder on the server to avoid hydration mismatch
    // and prevent layout shift.
    return (
      <div className="flex items-center gap-3 h-[48px]">
        <div className="w-[48px] h-[48px] bg-secondary rounded-md" />
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
      <Image src={logoSrc} alt="energy engine logo" width={48} height={48} className="rounded-md" />
      <div className="flex flex-col leading-tight">
        <span className="font-headline text-xl font-bold tracking-tighter text-primary">energy engine</span>
        <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">GRUPOS ELECTROGENOS</span>
      </div>
    </div>
  );
};
