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
    <div className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none transition-colors duration-700 ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f8fafc]'}`}>
      
      {/* Texture: Noise/Paper Grain - Enhanced for "Premium" feel */}
      <div 
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Topographic/Wavy Lines SVG - Increased visibility and organic feel */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 xl:opacity-60"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g 
          fill="none" 
          stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)"} 
          strokeWidth="0.8"
        >
          {/* Organic flow 1 */}
          <path d="M-100 100 Q 200 300, 500 100 T 1100 200 T 1600 0" className="opacity-50" />
          <path d="M-100 120 Q 200 320, 500 120 T 1100 220 T 1600 20" />
          <path d="M-100 140 Q 200 340, 500 140 T 1100 240 T 1600 40" />
          <path d="M-100 160 Q 200 360, 500 160 T 1100 260 T 1600 60" />

          {/* Organic flow 2 */}
          <path d="M-100 500 Q 300 700, 700 400 T 1200 600 T 1600 300" />
          <path d="M-100 530 Q 300 730, 700 430 T 1200 630 T 1600 330" />
          <path d="M-100 560 Q 300 760, 700 460 T 1200 660 T 1600 360" />

          {/* Vertical flow elements */}
          <path d="M400 -100 Q 600 300, 300 600 T 500 1200" opacity="0.4" />
          <path d="M430 -100 Q 630 300, 330 600 T 530 1200" opacity="0.4" />
          
          <path d="M1000 -100 Q 1200 400, 900 800 T 1100 1400" opacity="0.3" />
          <path d="M1030 -100 Q 1230 400, 930 800 T 1130 1400" opacity="0.3" />
        </g>
      </svg>

      {/* Decorative Blur Blobs for real Glassmorphism backdrop */}
      <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none transition-all duration-1000 ${isDark ? 'bg-primary/20' : 'bg-primary/5'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] pointer-events-none transition-all duration-1000 ${isDark ? 'bg-blue-600/10' : 'bg-blue-500/5'}`}></div>

      {/* Vignette effect for depth */}
      <div 
        className="absolute inset-0 pointer-events-none blur-sm"
        style={{
          background: isDark 
            ? 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.6) 100%)'
            : 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.4) 100%)'
        }}
      />
    </div>
  );
};

export default ModernBackground;
