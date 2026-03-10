'use client';
import { cn } from '@/lib/utils';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  // Este layout crea un "emulador" de teléfono en escritorio
  // y se expande a pantalla completa en dispositivos móviles.
  return (
    <div className="bg-slate-200 dark:bg-slate-900 flex items-center justify-center min-h-screen p-0 md:p-4 print:p-0 print:bg-white">
      <div 
        className={cn(
          "relative w-full h-screen md:h-[860px] md:max-h-[90vh] md:w-[420px]", // Tamaños base
          "bg-slate-100", // Fondo interior
          "md:rounded-[40px] md:border-[10px] md:border-black md:shadow-2xl", // Marco en desktop
          "flex flex-col overflow-hidden", // Estructura
          "print:w-full print:h-full print:max-h-none print:rounded-none print:border-0 print:shadow-none" // Estilos para impresión
        )}
      >
        {/* Notch estético para la simulación */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-black rounded-b-xl z-20 hidden md:block print:hidden"></div>
        
        {/* El contenido se desplaza aquí */}
        <div className="flex-1 overflow-y-auto no-scrollbar pt-8 md:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
