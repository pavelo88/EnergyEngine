'use client';

import React, { useCallback, useMemo } from 'react';
import Particles, { type Container, type Engine } from 'react-tsparticles';
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
    const particleColor = currentTheme === 'dark' ? '#ffffff' : '#555555';
    const linkColor = currentTheme === 'dark' ? '#ffffff' : '#555555';

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
            mode: 'repulse',
          },
          resize: true,
        },
        modes: {
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
          opacity: 0.1,
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
          value: 80,
        },
        opacity: {
          value: 0.2,
        },
        shape: {
          type: 'circle' as const,
        },
        size: {
          value: { min: 1, max: 2 },
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