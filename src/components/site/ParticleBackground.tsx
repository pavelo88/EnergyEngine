'use client';

import React, { useCallback, useMemo } from 'react';
import Particles from 'react-tsparticles';
import type { Container, Engine } from 'tsparticles-engine';
import { loadFull } from 'tsparticles';
import { useTheme } from 'next-themes';

const ParticleBackground = () => {
  const { theme, systemTheme } = useTheme();

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    // console.log(container);
  }, []);

  const particleOptions = useMemo(() => {
    const currentTheme = theme === 'system' ? systemTheme : theme;
    
    // Define professional, theme-aligned colors
    const particleColor = currentTheme === 'dark' 
      ? 'hsl(145, 63%, 45%)' // Green for dark mode (from primary theme color)
      : 'hsl(220, 20%, 40%)';  // Medium-dark gray for light mode

    const linkColor = currentTheme === 'dark' 
      ? 'hsl(145, 25%, 20%)'  // Dark, subtle green for links
      : 'hsl(220, 20%, 85%)';  // Very light gray for links

    return {
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: 'grab',
          },
          resize: true,
        },
        modes: {
          grab: {
            distance: 187, // Increased by 10% from 170
            links: {
              opacity: 0.1, // Slightly more visible on grab
            },
          },
          repulse: {
            distance: 80,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: particleColor,
        },
        links: {
          color: linkColor,
          distance: 150,
          enable: true,
          opacity: 0.05, // very subtle
          width: 1,
        },
        move: {
          direction: 'none' as const,
          enable: true,
          outModes: {
            default: 'bounce' as const,
          },
          random: false,
          speed: 0.5,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 800,
          },
          value: 88,
        },
        opacity: {
          value: 0.8,
        },
        shape: {
          type: 'circle' as const, // Changed from 'triangle'
        },
        size: {
          value: { min: 1, max: 3 }, // Reduced size for subtlety
        },
      },
      detectRetina: true,
    };
  }, [theme, systemTheme]);

  return (
    <div className="absolute inset-0 -z-10">
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        options={particleOptions}
      />
    </div>
  );
};

export default ParticleBackground;
