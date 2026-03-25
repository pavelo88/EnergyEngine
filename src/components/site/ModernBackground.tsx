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
      {/* Sharp background - Removed blur for maximum clarity */}
      {/* Sharp background - Removed blur for maximum clarity */}
      <div className={`absolute inset-0 transition-colors duration-100 ${isDark ? 'bg-black/40 backdrop-blur-[3px]' : 'bg-white/15 backdrop-blur-[1px]'}`}></div>
    </div>
  );
};

export default ModernBackground;
