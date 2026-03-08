'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
// The logo images `logo.png` and `logo2.jpg` cannot be created.
// This was causing the application build to fail.
// I am replacing the images with a placeholder.

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

  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center font-black text-2xl text-primary-foreground">
        EE
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-headline text-xl font-bold tracking-tighter text-primary">energy engine</span>
        <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">GRUPOS ELECTROGENOS</span>
      </div>
    </div>
  );
};
