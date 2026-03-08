'use client';

import React from 'react';
import { brands } from '@/lib/data';

const Brands = () => {
  return (
    <div className="flex items-center justify-center h-full">
        <div className="w-full space-y-8">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center lg:text-left">
                Marcas Aliadas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-12">
                {brands.map((brand, index) => (
                <div key={index} className="text-center lg:text-left">
                    <span className="text-2xl font-bold text-foreground/80 whitespace-nowrap">{brand}</span>
                </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Brands;
