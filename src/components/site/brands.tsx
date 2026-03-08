'use client';

import React from 'react';
import { brands } from '@/lib/data';

const Brands = () => {
  // Duplicamos las marcas para crear un efecto de bucle infinito y suave.
  const extendedBrands = [...brands, ...brands, ...brands, ...brands];

  return (
    <div
      className="w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]"
    >
      <ul className="flex items-center justify-center md:justify-start [&_li]:mx-8 animate-infinite-scroll">
        {extendedBrands.map((brand, index) => (
          <li key={index} className="text-2xl font-bold text-muted-foreground/60 whitespace-nowrap">
            {brand}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Brands;
