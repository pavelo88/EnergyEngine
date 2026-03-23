'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { getStoredOfflineEmail } from '@/lib/inspection-mode';

// Función estricta para asegurar que solo inspectores entren a esta ruta
const checkIsAuthorized = (userData: any) => {
  if (!userData) return false;
  let authorized = false;

  if (userData.roles) {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : Object.values(userData.roles);
    authorized = rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      return String(val).toLowerCase().trim() === 'inspector';
    });
  }
  if (!authorized && userData.role) {
    if (String(userData.role).toLowerCase().trim() === 'inspector') authorized = true;
  }
  return authorized;
};

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, firestore } = useFirebase();
  const router = useRouter();
  const [hasOfflineAccess, setHasOfflineAccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      if (isUserLoading) return;

      const offlineEmail = typeof window !== 'undefined' ? getStoredOfflineEmail() : null;

      if (!user && !offlineEmail) {
        if (isMounted) router.replace('/auth/inspection');
        return;
      }

      if (!user && offlineEmail) {
        if (isMounted) {
          setHasOfflineAccess(true);
          setIsCheckingAuth(false);
        }
        return;
      }

      if (user && user.email && firestore) {
        try {
          const { doc, getDocFromServer } = await import('firebase/firestore');
          const cleanEmail = user.email.trim().toLowerCase();
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);

          // FORZAMOS LECTURA DEL SERVIDOR: Para evitar leer un 'forcePasswordChange: true' atrapado en la caché
          const userDocSnap = await getDocFromServer(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();

            if (userData?.forcePasswordChange) {
              console.warn('Usuario requiere cambio de clave. Redirigiendo a Auth...');
              if (isMounted) router.replace('/auth/inspection');
              return;
            }

            if (!checkIsAuthorized(userData)) {
              console.warn('Usuario no tiene rol de inspector. Redirigiendo a Auth...');
              if (isMounted) router.replace('/auth/inspection');
              return;
            }
          } else {
            // Si el documento no existe en Firestore, expulsamos.
            if (isMounted) router.replace('/auth/inspection');
            return;
          }

        } catch (error) {
          console.error('Error verificando seguridad de Inspection:', error);
          // Opcional: Si falla la red al verificar, podríamos confiar en la sesión de Auth y dejarlo pasar,
          // pero por seguridad estricta, si no podemos verificar, lo mandamos al login.
          if (isMounted) router.replace('/auth/inspection');
          return;
        }
      }

      if (isMounted) setIsCheckingAuth(false);
    };

    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [user, isUserLoading, router, firestore]);

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

  if (!user && !hasOfflineAccess) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}