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
        <div className="flex-shrink-0 w-[200px] flex items-center justify-center px-8 transition-all duration-500">
            {hasError ? (
                <span
                    className={cn(
                        "text-xl font-bold font-headline uppercase tracking-widest transition-colors duration-500",
                        isCenter ? "text-primary scale-125" : "text-slate-400 grayscale"
                    )}
                >
                    {brand.name}
                </span>
            ) : (
                <div className={cn(
                    "relative w-32 h-16 transition-all duration-500",
                    isCenter ? "grayscale-0 scale-125 brightness-150 contrast-125" : "grayscale opacity-50 hover:opacity-100 brightness-125"
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

    const infiniteBrands = [...brands, ...brands, ...brands, ...brands];

    useEffect(() => {
        let animationId: number;
        const animate = () => {
            setScrollX((prev) => (prev + 1) % (brands.length * 200));
            animationId = requestAnimationFrame(animate);
        };
        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, []);

    const getIsCenter = (index: number) => {
        if (!containerRef.current) return false;
        const containerWidth = containerRef.current.offsetWidth;
        const itemWidth = 200;
        const centerPoint = containerWidth / 2;
        const itemPosition = (index * itemWidth) - scrollX + (itemWidth / 2);
        return Math.abs(itemPosition - centerPoint) < (itemWidth / 2);
    };

    return (
        <div id="marcas" className="relative py-24 overflow-hidden">
            {/* FORCE light glass belt in BOTH modes - Enclosing title */}
            <div className="absolute inset-x-4 top-4 bottom-4 bg-white/60 dark:bg-white/60 backdrop-blur-3xl rounded-huge border border-white/20 shadow-premium z-0" />
            
            <div className="container mx-auto px-6 mb-12 text-center max-w-5xl relative z-10">
                <h2 className="text-center text-[1.8rem] md:text-5xl font-serif font-medium mb-12 text-black dark:text-black leading-[1.2] tracking-tight pt-10">
                    Expertos en el mantenimiento de las <br /> <span className="text-primary italic">principales marcas del mercado</span>
                </h2>
            </div>

            <div className="relative flex overflow-hidden w-full z-10">
                <div
                    className="flex whitespace-nowrap py-4"
                    style={{ transform: `translateX(-${scrollX}px)` }}
                >
                    {infiniteBrands.map((brand, idx) => (
                        <BrandItem key={idx} brand={brand} isCenter={getIsCenter(idx)} />
                    ))}
                </div>
            </div>
        </div>
    );
}
