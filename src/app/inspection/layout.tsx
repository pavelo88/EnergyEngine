'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    // Si terminó de cargar y NO hay usuario, redirigir al login de inspección
    if (!isUserLoading && !user) {
      router.replace('/auth/inspection');
    }
  }, [user, isUserLoading, router]);

  // Si está cargando el estado del usuario o no hay usuario todavía, 
  // mostramos pantalla de carga para NO revelar el formulario
  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-slate-500 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Solo si hay usuario, renderizamos la app de inspección
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col min-h-screen">
          {children}
      </div>
    </div>
  );
}