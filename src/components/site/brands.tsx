'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface Brand {
    name: string;
    logoUrl: string;
}

// RESPETANDO TU LISTA TAL CUAL (Locales y Externos alternados)
const brands: Brand[] = [
    { name: 'Aksa Power Generation', logoUrl: '/logos_svg/Aksa.svg' },
    { name: 'Baudouin', logoUrl: 'https://logo.clearbit.com/baudouin.com' },
    { name: 'Atlas Copco', logoUrl: '/logos_svg/Atlas_Copco.svg' },
    { name: 'Siemens', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Siemens-logo.svg' },
    { name: 'Caterpillar', logoUrl: '/logos_svg/Caterpillar.svg' },
    { name: 'Leroy-Somer', logoUrl: 'https://logo.clearbit.com/leroy-somer.com' },
    { name: 'Cummins', logoUrl: '/logos_svg/Cummins.svg' },
    { name: 'Pramac', logoUrl: 'https://logo.clearbit.com/pramac.com' },
    { name: 'Deutz', logoUrl: '/logos_svg/Deutz.svg' },
    { name: 'Doosan', logoUrl: '/logos_svg/Doosan.svg' },
    { name: 'J.L. Metric', logoUrl: 'https://placehold.co/200x100?text=J.L.+Metric' },
    { name: 'Generac', logoUrl: '/logos_svg/Generac.svg' },
    { name: 'Stamford', logoUrl: 'https://logo.clearbit.com/stamford-avk.com' },
    { name: 'Isuzu', logoUrl: '/logos_svg/Isuzu.svg' },
    { name: 'Hipower', logoUrl: 'https://logo.clearbit.com/hipowersystems.com' },
    { name: 'Iveco', logoUrl: '/logos_svg/Iveco.svg' },
    { name: 'JCB', logoUrl: '/logos_svg/JCB.svg' },
    { name: 'Himoinsa', logoUrl: 'https://logo.clearbit.com/himoinsa.com' },
    { name: 'John Deere', logoUrl: '/logos_svg/John_Deere.svg' },
    { name: 'Yanmar Energy Systems', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Yanmar_logo.svg' },
    { name: 'Kohler', logoUrl: '/logos_svg/Kohler.svg' },
    { name: 'Grupel', logoUrl: 'https://logo.clearbit.com/grupel.eu' },
    { name: 'Kubota', logoUrl: '/logos_svg/Kubota.svg' },
    { name: 'MTU', logoUrl: '/logos_svg/MTU.svg' },
    { name: 'FPT', logoUrl: 'https://logo.clearbit.com/fptindustrial.com' },
    { name: 'Scania', logoUrl: '/logos_svg/Scania.svg' },
    { name: 'Perkins', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Perkins-Logo.svg' },
    { name: 'Socomec', logoUrl: '/logos_svg/Socomec.svg' },
    { name: 'Cummins Power Generation', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cummins_logo.svg' },
    { name: 'Volvo Penta', logoUrl: '/logos_svg/Volvo_Penta.svg' },
    { name: 'Mosa', logoUrl: 'https://logo.clearbit.com/mosa.it' },
    { name: 'Yanmar', logoUrl: '/logos_svg/Yanmar.svg' },
    { name: 'Linz Electric', logoUrl: 'https://logo.clearbit.com/linzelectric.com' },
    { name: 'Mecc Alte', logoUrl: 'https://logo.clearbit.com/meccalte.com' },
];

const BrandItem = ({ brand }: { brand: Brand }) => {
    const [hasError, setHasError] = useState(false);

    return (
        <div className="flex-shrink-0 w-[220px] flex items-center justify-center px-10">
            {hasError ? (
                <span className="text-sm font-headline font-black uppercase tracking-widest text-black/70 text-center">
                    {brand.name}
                </span>
            ) : (
                <div className="relative w-36 h-14 transition-all duration-500 hover:scale-110">
                    <Image
                        src={brand.logoUrl}
                        alt={`${brand.name} logo`}
                        fill
                        className="object-contain"
                        onError={() => setHasError(true)}
                        unoptimized
                    />
                </div>
            )}
        </div>
    );
};

export default function Brands() {
    const infiniteBrands = [...brands, ...brands];

    return (
        <section id="marcas" className="relative py-14 overflow-hidden">
            {/* FONDO BLANCO RESALTADO PARA AMBOS MODOS (Cristalino pero claro) */}
            <div className="absolute inset-y-2 inset-x-0 bg-white/80 backdrop-blur-md border-y border-white/40 shadow-lg z-0" />

            <div className="container mx-auto px-6 mb-10 text-center max-w-5xl relative z-10">
                {/* LETRAS NEGRAS Y GRANDES */}
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-headline font-black text-black tracking-tighter leading-none uppercase">
                    Mantenimiento para las <br />
                    <span className="text-primary">marcas líderes del mercado</span>
                </h2>
            </div>

            <div className="relative w-full overflow-hidden flex z-10">
                <style jsx>{`
                    @keyframes slide {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-slide {
                        animation: slide 75s linear infinite;
                        width: max-content;
                    }
                `}</style>

                <div className="animate-slide flex items-center py-6">
                    {infiniteBrands.map((brand, idx) => (
                        <BrandItem key={idx} brand={brand} />
                    ))}
                </div>
            </div>
        </section>
    );
}