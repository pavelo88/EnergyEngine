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
    // Corregido: Colores de alto contraste para partículas y enlaces
    const particleColor = currentTheme === 'dark' ? '#FFFFFF' : '#000000'; // Partículas negras en modo claro
    const linkColor = currentTheme === 'dark' ? '#CCCCCC' : '#AAAAAA';     // Enlaces grises en ambos modos

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
            distance: 170,
            links: {
              opacity: 1,
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
          opacity: 0.05, 
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
          type: 'triangle' as const,
        },
        size: {
          value: { min: 2, max: 6 },
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
