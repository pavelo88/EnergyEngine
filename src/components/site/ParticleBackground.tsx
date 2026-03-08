'use client';

import React, { useCallback, useMemo } from 'react';
import Particles, { type Engine } from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { useTheme } from 'next-themes';

export default function ParticleBackground() {
  const { theme } = useTheme();

  const particlesOptions = useMemo(() => {
    const particleColor = theme === 'dark' ? '#ffffff' : '#334155'; // white for dark, slate-700 for light
    const linkColor = theme === 'dark' ? '#475569' : '#cbd5e1'; // slate-600 for dark, slate-300 for light

    return {
      fullScreen: {
        enable: true,
        zIndex: -1,
      },
      particles: {
        number: {
          value: 80,
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
          value: 0.5,
          random: false,
          anim: {
            enable: false,
          },
        },
        size: {
          value: 2,
          random: true,
          anim: {
            enable: false,
          },
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: linkColor,
          opacity: 0.4,
          width: 1,
        },
        move: {
          enable: true,
          speed: 1,
          direction: 'none' as const,
          random: false,
          straight: false,
          out_mode: 'out' as const,
          bounce: false,
          attract: {
            enable: false,
            rotateX: 600,
            rotateY: 1200,
          },
        },
      },
      interactivity: {
        detect_on: 'canvas' as const,
        events: {
          onhover: {
            enable: true,
            mode: 'grab' as const,
          },
          onclick: {
            enable: true,
            mode: 'push' as const,
          },
          resize: true,
        },
        modes: {
          grab: {
            distance: 140,
            line_opacity: 1,
          },
          bubble: {
            distance: 400,
            size: 40,
            duration: 2,
            opacity: 8,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
          push: {
            particles_nb: 4,
          },
          remove: {
            particles_nb: 2,
          },
        },
      },
      retina_detect: true,
    };
  }, [theme]);

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  return <Particles id="tsparticles" init={particlesInit} options={particlesOptions} />;
}
