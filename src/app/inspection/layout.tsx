'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
// Importamos la función que lee si tienes un correo guardado para offline
import { getStoredOfflineEmail } from '@/lib/inspection-mode';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  // 1. Añadimos firestore aquí para poder hacer la consulta a la base de datos
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const [hasOfflineAccess, setHasOfflineAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      // Si Firebase sigue cargando, esperamos
      if (isUserLoading) return;

      // Buscamos si existe un correo guardado en el dispositivo para usar el PIN offline
      const offlineEmail = typeof window !== 'undefined' ? getStoredOfflineEmail() : null;

      if (!user && !offlineEmail) {
        // Si no hay Firebase Y TAMPOCO hay caché offline -> ¡Expulsado al login!
        router.replace('/auth/inspection');
        return;
      }

      if (!user && offlineEmail) {
        // Si no hay Firebase pero SÍ hay caché offline, le damos un pase temporal.
        // Tu archivo page.tsx se encargará de mostrar el <PinGate /> para validar.
        setHasOfflineAccess(true);
        setIsCheckingAuth(false);
        return;
      }

      // --- 🚨 EL CANDADO DE SEGURIDAD ONLINE (Nuevo) 🚨 ---
      // Si el usuario ESTÁ logueado en Firebase, verificamos que no deba cambiar su clave
      if (user && user.email && firestore) {
        try {
          const { doc, getDoc, getDocFromServer } = await import('firebase/firestore');
          const cleanEmail = user.email.trim().toLowerCase();
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);

          let userDocSnap = await getDoc(userDocRef);
          let userData = userDocSnap.data();

          // 👻 El Cazafantasmas: Ignoramos la caché incompleta
          if (userDocSnap.exists() && (!userData || !userData.roles)) {
            console.warn("Layout Inspection: Documento fantasma detectado. Dando 1.5s...");
            await new Promise(resolve => setTimeout(resolve, 1500));
            userDocSnap = await getDocFromServer(userDocRef);
            userData = userDocSnap.data();
          }

          // Si debe cambiar clave, lo pateamos AL LOGIN DE INSPECTION
          if (userDocSnap.exists() && userData?.forcePasswordChange) {
            console.warn('Usuario requiere cambio de clave. Redirigiendo a Auth...');
            router.replace('/auth/inspection');
            return;
          }
        } catch (error) {
          console.error('Error verificando seguridad de Inspection:', error);
        }
      }
      // ----------------------------------------------------

      // Si pasa todas las pruebas, lo dejamos entrar a la aplicación
      setIsCheckingAuth(false);
    };

    void verifyAccess();
  }, [user, isUserLoading, router, firestore]);

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