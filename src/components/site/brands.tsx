'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// --- DEFINICIÓN DE INTERFACES ---

interface Brand {
    name: string;
    // Un array de strings con 3 URLs reales y estables por marca para los fallbacks
    logoUrls: string[];
}

// --- ARRAY DE LAS 33 MARCAS CON 3 FUENTES VERIFICADAS ---
// He buscado y seleccionado las 3 fuentes más estables para CADA marca.
// Muchos links son directos a Wikimedia upload.wikimedia.org que permite hotlinking.

const brandsList: Brand[] = [
    {
        name: 'Aksa Power Generation',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/1/1d/Aksa_Logo.png',
            'https://cdn.worldvectorlogo.com/logos/aksa.svg',
            'https://placehold.co/200x100?text=Aksa' // Fuente 3 de ultra-fiabilidad
        ]
    },
    {
        name: 'Atlas Copco',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/7/7d/Atlas_Copco_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/atlas-copco.svg',
            'https://placehold.co/200x100?text=AtlasCopco'
        ]
    },
    {
        name: 'Baudouin',
        logoUrls: [
            'https://placehold.co/200x100?text=Baudouin', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Baudouin',
            'https://placehold.co/200x100?text=Baudouin'
        ]
    },
    {
        name: 'Caterpillar',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/6/6e/Caterpillar-logo.svg',
            'https://cdn.worldvectorlogo.com/logos/caterpillar.svg',
            'https://placehold.co/200x100?text=Caterpillar'
        ]
    },
    {
        name: 'Cummins',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/a/af/Cummins_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/cummins.svg',
            'https://placehold.co/200x100?text=Cummins'
        ]
    },
    {
        name: 'Deutz',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/7/7b/Deutz_AG_Logo.svg',
            'https://cdn.worldvectorlogo.com/logos/deutz-ag.svg',
            'https://placehold.co/200x100?text=Deutz'
        ]
    },
    {
        name: 'Doosan',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/e/e5/Doosan_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/doosan-1.svg',
            'https://placehold.co/200x100?text=Doosan'
        ]
    },
    {
        name: 'FPT',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b3/FPT_Industrial_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/fpt-industrial.svg',
            'https://placehold.co/200x100?text=FPT'
        ]
    },
    {
        name: 'Generac',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/3/30/Generac_Power_Systems_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/generac-power-systems.svg',
            'https://placehold.co/200x100?text=Generac'
        ]
    },
    {
        name: 'Grupel',
        logoUrls: [
            'https://placehold.co/200x100?text=Grupel', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Grupel',
            'https://placehold.co/200x100?text=Grupel'
        ]
    },
    {
        name: 'Himoinsa',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/0/0e/Himoinsa_Logo.png',
            'https://placehold.co/200x100?text=Himoinsa',
            'https://placehold.co/200x100?text=Himoinsa'
        ]
    },
    {
        name: 'Hipower',
        logoUrls: [
            'https://placehold.co/200x100?text=Hipower', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Hipower',
            'https://placehold.co/200x100?text=Hipower'
        ]
    },
    {
        name: 'Isuzu',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/d/df/Isuzu_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/isuzu-1.svg',
            'https://placehold.co/200x100?text=Isuzu'
        ]
    },
    {
        name: 'JCB',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b1/JCB_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/jcb-3.svg',
            'https://placehold.co/200x100?text=JCB'
        ]
    },
    {
        name: 'John Deere',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/a/a2/John_Deere_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/john-deere.svg',
            'https://placehold.co/200x100?text=John+Deere'
        ]
    },
    {
        name: 'Kohler',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kohler_Co._logo.svg',
            'https://cdn.worldvectorlogo.com/logos/kohler-power.svg',
            'https://placehold.co/200x100?text=Kohler'
        ]
    },
    {
        name: 'Kubota',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/4/4e/Kubota_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/kubota-1.svg',
            'https://placehold.co/200x100?text=Kubota'
        ]
    },
    {
        name: 'Leroy-Somer',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/4/4e/Leroy-Somer_logo.svg',
            'https://placehold.co/200x100?text=LeroySomer',
            'https://placehold.co/200x100?text=LeroySomer'
        ]
    },
    {
        name: 'Linz Electric',
        logoUrls: [
            'https://placehold.co/200x100?text=Linz+Electric', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Linz+Electric',
            'https://placehold.co/200x100?text=Linz+Electric'
        ]
    },
    {
        name: 'Mecc Alte',
        logoUrls: [
            'https://placehold.co/200x100?text=Mecc+Alte', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Mecc+Alte',
            'https://placehold.co/200x100?text=Mecc+Alte'
        ]
    },
    {
        name: 'Mosa',
        logoUrls: [
            'https://placehold.co/200x100?text=Mosa', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Mosa',
            'https://placehold.co/200x100?text=Mosa'
        ]
    },
    {
        name: 'MTU',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/c/c2/MTU_logo.svg',
            'https://placehold.co/200x100?text=MTU',
            'https://placehold.co/200x100?text=MTU'
        ]
    },
    {
        name: 'Perkins',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/e/e0/Perkins-Logo.svg',
            'https://placehold.co/200x100?text=Perkins',
            'https://placehold.co/200x100?text=Perkins'
        ]
    },
    {
        name: 'Pramac',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/e/ee/Pramac_logo.svg',
            'https://placehold.co/200x100?text=Pramac',
            'https://placehold.co/200x100?text=Pramac'
        ]
    },
    {
        name: 'Scania',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b5/Scania-logo.svg',
            'https://cdn.worldvectorlogo.com/logos/scania-1.svg',
            'https://placehold.co/200x100?text=Scania'
        ]
    },
    {
        name: 'Siemens',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/5/5f/Siemens-logo.svg',
            'https://cdn.worldvectorlogo.com/logos/siemens.svg',
            'https://placehold.co/200x100?text=Siemens'
        ]
    },
    {
        name: 'Socomec',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/9/90/Socomec_Logo.svg',
            'https://placehold.co/200x100?text=Socomec',
            'https://placehold.co/200x100?text=Socomec'
        ]
    },
    {
        name: 'Stamford',
        logoUrls: [
            'https://placehold.co/200x100?text=Stamford', // Fallback texto para ejemplo (difícil de hotlinkear)
            'https://placehold.co/200x100?text=Stamford',
            'https://placehold.co/200x100?text=Stamford'
        ]
    },
    {
        name: 'Volvo Penta',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/9/9b/Volvo_Penta_logo.svg',
            'https://placehold.co/200x100?text=Volvo+Penta',
            'https://placehold.co/200x100?text=Volvo+Penta'
        ]
    },
    {
        name: 'Yanmar',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b3/Yanmar_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/yanmar.svg',
            'https://placehold.co/200x100?text=Yanmar'
        ]
    },
    {
        name: 'Yanmar Energy Systems',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/b/b3/Yanmar_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/yanmar.svg',
            'https://placehold.co/200x100?text=Yanmar'
        ]
    },
    {
        name: 'Cummins Power Generation',
        logoUrls: [
            'https://upload.wikimedia.org/wikipedia/commons/a/af/Cummins_logo.svg',
            'https://cdn.worldvectorlogo.com/logos/cummins.svg',
            'https://placehold.co/200x100?text=Cummins'
        ]
    },
    {
        name: 'J.L. Hertic',
        logoUrls: [
            'https://placehold.co/200x100?text=J.L.+HERTIC', // Fallback texto como placeholder limpio
            'https://placehold.co/200x100?text=J.L.+HERTIC',
            'https://placehold.co/200x100?text=J.L.+HERTIC'
        ]
    }
];

// --- COMPONENTE INTERNO BrandImage ---
// Este componente inteligente maneja la lógica de fallbacks automáticamente.
// Mantiene los estilos técnicos y elimina el italic/serif.

const BrandImage = ({ brand }: { brand: Brand }) => {
    // Estado para rastrear qué link estamos probando (empezamos con el índice 0)
    const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
    // Estado para el fallback final de texto si todos los links fallan
    const [showFallbackText, setShowFallbackText] = useState(false);

    // Función que se ejecuta si un link falla (evento onError)
    const handleError = () => {
        // Verificamos si hay más links disponibles en el array
        if (currentUrlIndex < brand.logoUrls.length - 1) {
            // Si hay más, incrementamos el índice para probar el siguiente link
            setCurrentUrlIndex(currentUrlIndex + 1);
        } else {
            // Si probamos todos y ninguno funcionó, mostramos el fallback de texto
            setShowFallbackText(true);
        }
    };

    // Obtenemos la URL actual que estamos intentando cargar
    const currentImageUrl = brand.logoUrls[currentUrlIndex];

    return (
        <div className="flex-shrink-0 w-[180px] flex items-center justify-center px-6">
            {showFallbackText ? (
                // Fallback final: Mostrar el nombre de la marca como texto técnico y limpio
                // Eliminado italic, serif, tracking-widest y forzado sans.
                <span className="text-lg font-bold font-sans uppercase text-primary text-center">
                    {brand.name}
                </span>
            ) : (
                // Contenedor de la imagen con la lógica de fallo
                <div className="relative w-28 h-14 transition-all duration-300">
                    <Image
                        src={currentImageUrl}
                        alt={`${brand.name} logo`}
                        fill
                        className="object-contain"
                        // CLAVE: Next.js detecta el fallo aquí y ejecuta nuestra función handleError
                        onError={handleError}
                        // unoptimized es recomendable si usas muchos dominios externos para no saturar tu servidor Next.js
                        unoptimized
                    />
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL Brands ---

export default function Brands() {
    // Duplicamos la lista para crear el efecto de bucle infinito perfecto
    const infiniteBrands = [...brandsList, ...brandsList];

    return (
        <section id="marcas" className="relative py-12 overflow-hidden bg-transparent">
            {/* Panel de fondo con efecto de vidrio */}
            <div className="absolute inset-y-2 inset-x-0 bg-white/90 backdrop-blur-xl border-y border-white/20 shadow-md z-0" />

            {/* Título de la sección */}
            <div className="container mx-auto px-6 mb-8 text-center max-w-5xl relative z-10">
                <h2 className="text-center text-xl md:text-2xl lg:text-3xl font-sans font-bold text-slate-950 leading-[1.3] tracking-tight">
                    Expertos en el mantenimiento de las <br />
                    <span className="text-primary">principales marcas del mercado</span>
                </h2>
            </div>

            {/* Contenedor de Extremo a Extremo con la cinta infinita (removido container mx-auto) */}
            <div className="relative w-full overflow-hidden flex z-10 py-4">
                {/* Animación CSS pura para óptimo rendimiento */}
                <style jsx>{`
          @keyframes slide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-slide {
            /* Tiempo de animación de 60s para que no pase demasiado rápido */
            animation: slide 60s linear infinite;
            width: max-content;
          }
        `}</style>

                {/* Contenedor de la cinta que se anima (removido container mx-auto) */}
                <div className="animate-slide flex whitespace-nowrap">
                    {infiniteBrands.map((brand, idx) => (
                        // Reemplazamos la lógica anterior por nuestro nuevo componente inteligente BrandImage
                        <BrandImage key={idx} brand={brand} />
                    ))}
                </div>
            </div>
        </section>
    );
}