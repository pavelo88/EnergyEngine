'use client';

import React from 'react';

export default function ParticleBackground() {
  return (
    <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden bg-background">
      <div className="sphere-animation">
        <div className="sphere">
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
          <div className="ring"></div>
        </div>
      </div>
    </div>
  );
}
