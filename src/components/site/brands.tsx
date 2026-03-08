'use client';

import React from 'react';
import { brands } from '@/lib/data';

const Brands = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
        {brands.map((brand, index) => (
          <div
            key={index}
            className="flex items-center justify-center text-center p-4 h-24 rounded-lg border border-primary/10 bg-primary/5 shadow-sm"
          >
            <span className="text-lg font-bold text-foreground/80 whitespace-nowrap">
              {brand}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Brands;
