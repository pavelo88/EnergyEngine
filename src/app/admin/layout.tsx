'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading, auth } = useFirebase();
  const router = useRouter();
  
  // Estados de autorización: 'loading' | 'authorized' | 'unauthorized'
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const checkInspectorAccess = async () => {
      // 1. Esperar a que Firebase termine de cargar el estado inicial
      if (isUserLoading) return;

      // 2. Si no hay usuario autenticado, redirigir al login de inspección
      if (!user) {
        setAuthStatus('unauthorized');
        router.replace('/auth/inspection');
        return;
      }

      try {
        // 3. Verificar si el usuario existe en Firestore y tiene el rol 'inspector'
        if (user.email && firestore) {
          const userDocRef = doc(firestore, 'usuarios', user.email);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const roles = userData.roles || [];

            // Validar que sea inspector (o admin que también puede inspeccionar)
            if (roles.includes('inspector') || roles.includes('admin')) {
              setAuthStatus('authorized');
            } else {
              console.warn("Acceso denegado: El usuario no tiene rol de inspector.");
              setAuthStatus('unauthorized');
              router.replace('/auth/inspection');
            }
          } else {
            console.error("Documento de usuario no encontrado en Firestore.");
            setAuthStatus('unauthorized');
            router.replace('/auth/inspection');
          }
        }
      } catch (error) {
        console.error("Error verificando permisos de inspección:", error);
        setAuthStatus('unauthorized');
        router.replace('/auth/inspection');
      }
    };

    checkInspectorAccess();
  }, [user, isUserLoading, firestore, router]);

  // Pantalla de carga mientras se verifica la identidad
  if (authStatus === 'loading' || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 font-bold animate-pulse">VERIFICANDO CREDENCIALES...</p>
      </div>
    );
  }

  // Prevención de "flicker" o parpadeo del contenido si no está autorizado
  if (authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <p className="text-slate-800 font-bold text-center px-4">
          Sesión expirada o sin permisos. Redirigiendo...
        </p>
      </div>
    );
  }

  // Si está autorizado, renderizar la aplicación de inspección
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col min-h-screen relative">
        {children}
      </div>
    </div>
  );
}