'use client';
import { cn } from '@/lib/utils';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  // Este layout ahora es un contenedor simple que se adapta a todos los tamaños de pantalla.
  // La lógica de presentación está en el componente de la página.
  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen print:bg-white">
      <div className="flex flex-col min-h-screen">
          {children}
      </div>
    </div>
  );
}
