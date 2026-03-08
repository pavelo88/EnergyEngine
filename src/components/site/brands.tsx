'use client';

import React from 'react';
import { brands } from '@/lib/data';

const Brands = () => {
    const totalBrands = brands.length;
    const angleStep = 360 / totalBrands;
    // Adjust radius based on the number of brands to avoid overlap
    const radius = totalBrands > 10 ? 220 : 180;

    return (
        <div className="flex items-center justify-center h-full w-full perspective-[1000px]">
            <div className="relative w-full h-64 animate-spin-brands [transform-style:preserve-3d]">
                {brands.map((brand, index) => {
                    const angle = angleStep * index;
                    return (
                        <div
                            key={index}
                            className="absolute top-1/2 left-1/2 w-48 h-16 -mt-8 -ml-24 flex items-center justify-center rounded-lg border border-primary/10 bg-primary/5 p-4 shadow-sm backdrop-blur-sm"
                            style={{
                                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                            }}
                        >
                            <span className="text-xl font-bold text-foreground/80 whitespace-nowrap">
                                {brand}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Brands;
