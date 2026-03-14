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
          const userDocRef = doc(firestore, 'usuarios', user.email);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const roles = userData.roles || [];

            if (roles.includes('admin')) {
              setAuthStatus('authorized');
            } else {
              setAuthStatus('unauthorized');
              router.replace('/auth/admin');
            }
          } else {
            setAuthStatus('unauthorized');
            router.replace('/auth/admin');
          }
        }
      } catch (error) {
        setAuthStatus('unauthorized');
        router.replace('/auth/admin');
      }
    };

    checkAdminAccess();
  }, [user, isUserLoading, firestore, router]);

  if (authStatus === 'loading' || isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Verificando Credenciales de Administración...</p>
      </div>
    );
  }

  if (authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <ShieldAlert className="h-12 w-12 text-red-500" />
        <p className="text-slate-800 font-bold text-center px-4">
          Sin permisos administrativos. Redirigiendo...
        </p>
      </div>
    );
  }

  return (
    <AdminHeaderProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          user={user as any} 
        />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={() => setIsSidebarOpen(true)} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminHeaderProvider>
  );
}
