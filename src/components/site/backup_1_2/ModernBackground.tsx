'use client';

import React from 'react';
import { useTheme } from 'next-themes';

const ModernBackground = () => {
  const [mounted, setMounted] = React.useState(false);
  const { theme, systemTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none transition-all duration-700"
      style={{
        backgroundImage: "url('/hero.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* ANTES: Tenías bg-black/40 (muy oscuro) y backdrop-blur-[3px].
         AHORA: Bajamos a bg-black/10 y backdrop-blur-[1px] para que sea 
         idéntico al modo claro y se vea el motor nítido.
      */}
      <div className={`absolute inset-0 transition-colors duration-100 ${isDark ? 'bg-black/10 backdrop-blur-[1px]' : 'bg-white/10 backdrop-blur-[1px]'
        }`}></div>
    </div>
  );
};

export default ModernBackground;