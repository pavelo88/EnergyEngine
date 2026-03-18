'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ShieldAlert } from 'lucide-react';
import Sidebar from '@/app/admin/components/Sidebar';
import Header from '@/app/admin/components/Header';
import { AdminHeaderProvider } from '@/app/admin/components/AdminHeaderContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, firestore, isUserLoading } = useFirebase();
  const router = useRouter();

  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (isUserLoading) return;

      if (!user) {
        setAuthStatus('unauthorized');
        router.replace('/auth/admin');
        return;
      }

      try {
        if (user.email && firestore) {
          // CORRECCIÓN: Convertir a minúsculas para que coincida con la base de datos
          const cleanEmail = user.email.toLowerCase();
          const userDocRef = doc(firestore, 'usuarios', cleanEmail);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const roles = userData.roles || [];

            if (roles.includes('admin')) {
              setAuthStatus('authorized');
            } else {
              console.warn("El usuario existe, pero no tiene el rol de 'admin'");
              setAuthStatus('unauthorized');
              router.replace('/auth/admin');
            }
          } else {
            console.warn("No se encontró el documento del usuario en la tabla 'usuarios'");
            setAuthStatus('unauthorized');
            router.replace('/auth/admin');
          }
        }
      } catch (error) {
        // CORRECCIÓN: Mostrar error en consola en vez de fallar en silencio
        console.error("Firebase bloqueó la lectura del usuario:", error);
        setAuthStatus('unauthorized');
        router.replace('/auth/admin');
      }
    };

    checkAdminAccess();
  }, [user, isUserLoading, firestore, router]);

  if (authStatus === 'loading' || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 gap-4">
        {/* Light mode (Comentado): bg-slate-50 */}
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Verificando Credenciales de Administración...</p>
      </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 gap-4">
        {/* Light mode (Comentado): bg-slate-50 */}
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <p className="text-slate-800 font-bold text-center px-4">
          Sin permisos administrativos. Redirigiendo...
        </p>
      </div>
    );
  }

  return (
    <AdminHeaderProvider>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
        {/* Light mode (Comentado): bg-slate-50 text-slate-900 */}

        {/* Decorative Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute top-[20%] left-[20%] w-[10%] h-[10%] bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={user as any}
        />

        <div className="flex flex-1 flex-col overflow-hidden relative z-10">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />

          <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Background decorative glows */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      </div>
    </AdminHeaderProvider>
  );
}
