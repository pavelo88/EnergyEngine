'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
// Importamos la función que lee si tienes un correo guardado para offline
import { getStoredOfflineEmail } from '@/lib/inspection-mode';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();
  const [hasOfflineAccess, setHasOfflineAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Si Firebase sigue cargando, esperamos
    if (isUserLoading) return;

    // Buscamos si existe un correo guardado en el dispositivo para usar el PIN offline
    const offlineEmail = typeof window !== 'undefined' ? getStoredOfflineEmail() : null;

    if (!user && !offlineEmail) {
      // Si no hay Firebase Y TAMPOCO hay caché offline -> ¡Expulsado al login!
      router.replace('/auth/inspection');
    } else {
      // Si no hay Firebase pero SÍ hay caché offline, le damos un pase temporal.
      // Tu archivo page.tsx se encargará de mostrar el <PinGate /> para validar.
      if (!user && offlineEmail) {
        setHasOfflineAccess(true);
      }
      setIsCheckingAuth(false);
    }
  }, [user, isUserLoading, router]);

  // Pantalla de carga mientras verificamos
  if (isUserLoading || isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-slate-500 font-medium">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Prevenir parpadeos extraños mientras Next.js redirige
  if (!user && !hasOfflineAccess) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}