'use client';

import { brands } from '@/lib/data';
import React, { useState, useEffect, useRef } from 'react';

export default function Brands() {
    const [rotation, setRotation] = useState(0);
    const [radius, setRadius] = useState(280); 
    const requestRef = useRef<number>(0);
    
    const totalDisplayBrands = brands.length;

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            // Configuramos 3 tamaños de radio para: Celular, Tablet y Escritorio
            if (width < 640) {
                setRadius(130); // Celular
            } else if (width < 1024) {
                setRadius(200); // Tablet
            } else {
                setRadius(280); // Escritorio
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        const animate = () => {
            setRotation(prev => prev - 0.03); 
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, []);
    
    return (
        <section id="marcas" className="py-12 scroll-mt-20 overflow-hidden">
      
            <div className="max-w-6xl mx-auto px-4">
                {/* Redujimos el mb-10 a mb-4 para quitar el espacio en blanco gigante */}
                <h2 className="text-center text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 font-headline">
                    Aliados<span className="text-primary">Tecnológicos</span>
                </h2>  

            {/* Redujimos el mt-16 a mt-4 y ajustamos la altura dinámica del contenedor */}
            <div className="relative mt-4 flex items-center justify-center [perspective:1200px] [mask-image:radial-gradient(circle_at_center,white_40%,transparent_80%)]" 
                    style={{ height: radius < 150 ? "200px" : radius < 250 ? "250px" : "350px" }}>
                
                <div className="absolute h-full w-full"
                    style={{
                        transformStyle: "preserve-3d",
                        transform: `rotateX(-15deg) rotateY(${rotation}deg)` 
                    }}
                >
                    {brands.map((brand, index) => {
                        const angle = (360 / totalDisplayBrands) * index;
                        
                        return (
                            <div
                                key={brand}
                                // ¡OJO AQUÍ! 
                                // 1. Quitamos los -translate de Tailwind
                                // 2. Hicimos tarjetas pequeñas en móvil (w-28 h-12) y grandes en compu (md:w-44 md:h-20)
                                className="absolute left-1/2 top-1/2 flex w-20 h-12 md:w-44 md:h-20 items-center justify-center rounded-2xl border bg-secondary/50 p-2 md:p-4 text-center dark:bg-white/[0.03] backdrop-blur-sm"
                                style={{
                                    // 3. Agregamos translate(-50%, -50%) directo al transform para arreglar el "baile"
                                    transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${radius}px)`,
                                }}
                            >
                                {/* El texto también es más pequeño en móvil (text-[10px]) */}
                                <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                    {brand}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </section>
    );
}