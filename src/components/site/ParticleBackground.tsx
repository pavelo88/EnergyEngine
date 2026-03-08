'use client';

import React, { useCallback, useMemo } from 'react';
import Particles, { type Engine } from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import { useTheme } from 'next-themes';

export default function ParticleBackground() {
  const { theme } = useTheme();

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const particlesOptions = useMemo(() => {
    const particleColor = theme === 'dark' ? '#94a3b8' : '#94a3b8'; // slate-400 for both
    const linkColor = theme === 'dark' ? '#334155' : '#e2e8f0'; // slate-700 for dark, slate-200 for light

    return {
      fullScreen: {
        enable: true,
        zIndex: -1,
      },
      particles: {
        number: {
          value: 100,
          density: {
            enable: true,
            value_area: 800,
          },
        },
        color: {
          value: particleColor,
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: { min: 0.1, max: 0.6 },
          animation: {
            enable: true,
            speed: 1,
            sync: false,
          },
        },
        size: {
          value: { min: 0.5, max: 1.5 },
        },
        move: {
          enable: true,
          speed: 0.2,
          direction: 'none',
          out_mode: 'out',
        },
        links: {
          enable: true,
          distance: 120,
          color: linkColor,
          opacity: 0.2,
          width: 1,
        },
      },
      interactivity: {
        events: {
          onhover: {
            enable: true,
            mode: 'bubble',
          },
        },
        modes: {
          bubble: {
            distance: 200,
            size: 2,
            duration: 2,
            opacity: 1,
          },
        },
      },
    };
  }, [theme]);

  // The 'as any' is needed because the options type from tsparticles is very complex
  return <Particles id="tsparticles" init={particlesInit} options={particlesOptions as any} />;
}
