'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

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

  return (
    <div className="flex items-center gap-3">
       <div className="w-12 h-12 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary"/>
       </div>
      <div className="flex flex-col leading-tight">
        <span className="font-headline text-xl font-bold tracking-tighter text-primary">energy engine</span>
        <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">GRUPOS ELECTROGENOS</span>
      </div>
    </div>
  );
};
