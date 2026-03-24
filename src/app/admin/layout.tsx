'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import Sidebar from '@/app/admin/components/Sidebar';
import Header from '@/app/admin/components/Header';
import { AdminHeaderProvider } from '@/app/admin/components/AdminHeaderContext';
// Removidos los imports de admin-access para usar validación local estricta

// Función de validación de roles estricta (igual que en el login)
const checkIsAuthorizedAdmin = (userData: any) => {
  if (!userData) return false;
  let authorized = false;

  if (userData.roles) {
    const rolesArray = Array.isArray(userData.roles) ? userData.roles : Object.values(userData.roles);
    authorized = rolesArray.some((r: any) => {
      const val = typeof r === 'string' ? r : (r?.value || r?.id || '');
      const norm = String(val).toLowerCase().trim();
      return norm === 'admin' || norm === 'super';
    });
  }

  if (!authorized && userData.role) {
    const norm = String(userData.role).toLowerCase().trim();
    if (norm === 'admin' || norm === 'super') authorized = true;
  }

  return authorized;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      if (isUserLoading) return;

      if (!user || !user.email || !firestore) {
        if (isMounted) {
          setAuthStatus('unauthorized');
          router.replace('/auth/admin');
        }
        return;
      }

      try {
        const cleanEmail = user.email.trim().toLowerCase();

        // Usamos importación dinámica
        const { doc, getDocFromServer } = await import('firebase/firestore');
        const userDocRef = doc(firestore, 'usuarios', cleanEmail);

        // FORZAMOS LECTURA DEL SERVIDOR para evitar el bucle de caché de "forcePasswordChange"
        const userDocSnap = await getDocFromServer(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();

          if (userData?.forcePasswordChange) {
            console.warn('Usuario requiere cambio de clave. Redirigiendo a Auth...');
            if (isMounted) router.replace('/auth/admin');
            return;
          }

          if (checkIsAuthorizedAdmin(userData)) {
            if (isMounted) setAuthStatus('authorized');
            return;
          }

          console.warn('El usuario existe, pero no tiene rol admin.');
          if (isMounted) {
            setAuthStatus('unauthorized');
            router.replace('/auth/admin');
          }
        } else {
          console.warn('Documento de usuario no encontrado en Firestore.');
          if (isMounted) {
            setAuthStatus('unauthorized');
            router.replace('/auth/admin');
          }
        }
      } catch (error) {
        console.error('Error verificando acceso admin:', error);
        if (isMounted) {
          setAuthStatus('unauthorized');
          router.replace('/auth/admin');
        }
      }
    };

    void checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user, isUserLoading, firestore, router]);

  if (authStatus === 'loading' || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Verificando credenciales de administracion...</p>
      </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 gap-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <p className="text-slate-800 font-bold text-center px-4">Sin permisos administrativos. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <AdminHeaderProvider>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute top-[20%] left-[20%] w-[10%] h-[10%] bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={user as any} />

        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">{children}</div>
          </main>
        </div>

        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      </div>
    </AdminHeaderProvider>
  );
}