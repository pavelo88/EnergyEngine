'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Brand {
    name: string;
    logoUrl: string;
}

const brands: Brand[] = [
    { name: 'Perkins', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Perkins-Logo.svg' },
    { name: 'Guascor Energy', logoUrl: 'https://guascor-energy.com/wp-content/uploads/2026/02/guascor-logo-60.svg' },
    { name: 'Cummins', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cummins_logo.svg' },
    { name: 'IVECO', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Iveco_Logo_2023.svg' },
    { name: 'Volvo Penta', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Volvo_Penta_stacked_wordmark.svg' },
    { name: 'MAN', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/MAN_logo.svg' },
    { name: 'MTU', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/MTU_Solutions_logo.svg' },
    { name: 'Rolls Royce', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rolls-Royce_Group_logo.svg' }
];

const BrandItem = ({ brand, isCenter }: { brand: Brand; isCenter: boolean }) => {
    const [hasError, setHasError] = useState(false);

    return (
        // Reducimos el ancho del contenedor del item (de 200px a 180px)
        <div className="flex-shrink-0 w-[180px] flex items-center justify-center px-6 transition-all duration-500">
            {hasError ? (
                <span
                    className={cn(
                        // Eliminamos el efecto serif/italic. Forzamos Space Grotesk técnica.
                        "text-lg font-bold font-sans uppercase tracking-widest transition-colors duration-500",
                        isCenter ? "text-primary scale-110" : "text-slate-400 grayscale"
                    )}
                >
                    {brand.name}
                </span>
            ) : (
                <div className={cn(
                    // Reducimos el tamaño de la imagen (de w-32 a w-28) y suavizamos el enfoque central
                    "relative w-28 h-14 transition-all duration-500",
                    isCenter ? "grayscale-0 scale-110 brightness-110" : "grayscale opacity-50 hover:opacity-100"
                )}>
                    <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        fill
                        className="object-contain"
                        onError={() => setHasError(true)}
                    />
                </div>
            )}
        </div>
    );
};

export default function Brands() {
    const [scrollX, setScrollX] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Multiplicamos las marcas para el scroll infinito
    const infiniteBrands = [...brands, ...brands, ...brands, ...brands];

    useEffect(() => {
        let animationId: number;
        const animate = () => {
            // Ajustamos el calculo del scroll para el nuevo ancho de item (180px)
            setScrollX((prev) => (prev + 1) % (brands.length * 180));
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, []);

    const getIsCenter = (index: number) => {
        if (!containerRef.current) return false;
        const containerWidth = containerRef.current.offsetWidth;
        const itemWidth = 180; // Ajustado
        const centerPoint = containerWidth / 2;
        const itemPosition = (index * itemWidth) - scrollX + (itemWidth / 2);
        return Math.abs(itemPosition - centerPoint) < (itemWidth / 2);
    };

    return (
        // Reducimos el padding vertical total (de py-24 a py-12). Fondo transparente base.
        <section id="marcas" className="relative py-12 px-6 overflow-hidden bg-transparent">
            {/* EL CAMBIO CLAVE: Panel de "vidrio blanco esmerilado un poco blanco" UNIFORME */}
            {/* Usamos inset-2 rounded-2xl para un look más compacto y menos "Apple-huge" */}
            <div className="absolute inset-2 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-md z-0" />

            <div className="container mx-auto px-6 mb-8 text-center max-w-5xl relative z-10">
                {/* Reducimos el tamaño del título (de 5xl a 3xl max). Forzamos Space Grotesk. Texto oscuro para el fondo blanco. */}
                <h2 className="text-center text-xl md:text-2xl lg:text-3xl font-sans font-bold mb-8 text-slate-950 leading-[1.3] tracking-tight">
                    Expertos en el mantenimiento de las <br /> <span className="text-primary">principales marcas del mercado</span>
                </h2>
            </div>

            <div className="relative flex overflow-hidden w-full z-10 container mx-auto" ref={containerRef}>
                <div
                    className="flex whitespace-nowrap py-2"
                    style={{ transform: `translateX(-${scrollX}px)` }}
                >
                    {infiniteBrands.map((brand, idx) => (
                        <BrandItem key={idx} brand={brand} isCenter={getIsCenter(idx)} />
                    ))}
                </div>
            </div>
        </section>
    );
}