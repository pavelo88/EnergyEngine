'use client';

import React, { useEffect, useRef } from 'react';
import { brands } from '@/lib/data';

const Brands = () => {
  const sphereRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sphere = sphereRef.current;
    const container = containerRef.current;

    if (!sphere || !container) return;

    // Reparte las marcas alrededor del anillo
    const items = sphere.children;
    const total = items.length;
    const angleStep = (2 * Math.PI) / total;
    const radius = 180; // Radio del anillo

    for (let i = 0; i < total; i++) {
      const item = items[i] as HTMLElement;
      const angle = i * angleStep;

      // Posición en el círculo 3D
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);

      item.style.setProperty('--transform', `rotateY(${angle}rad) translateZ(${radius}px)`);
    }

    // Interacción con el ratón
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      
      const rotateX = -mouseY * 15; // Rotación vertical
      const rotateY = mouseX * 15;  // Rotación horizontal
      
      sphere.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="brands-sphere-container w-full h-96 flex items-center justify-center">
      <div ref={sphereRef} className="brands-sphere">
        {brands.map((brand, i) => (
          <div key={i} className="brand-item">
            {brand}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Brands;
