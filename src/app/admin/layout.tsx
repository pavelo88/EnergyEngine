'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/app/admin/components/Sidebar';
import Header from '@/app/admin/components/Header';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import ForceChangePassword from '@/components/auth/ForceChangePassword';

const pageTitles: { [key: string]: string } = {
  '/admin': 'Dashboard',
  '/admin/users': 'Gestión de Usuarios',
  '/admin/clients': 'Gestión de Clientes',
  '/admin/jobs': 'Gestión de Trabajos',
  '/admin/expenses': 'Reporte de Gastos',
  '/admin/reports': 'Informes de Inspección',
  '/admin/import': 'Importar Datos',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'needs_password_change'>('loading');

  useEffect(() => {
    if (isUserLoading || !firestore) return;

    if (user && user.email) {
      const checkUserStatus = async () => {
        try {
          const userDocRef = doc(firestore, 'usuarios', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.roles?.includes('admin')) {
              if (userData.forcePasswordChange) {
                setAuthStatus('needs_password_change');
              } else {
                setAuthStatus('authorized');
              }
            } else {
              setAuthStatus('unauthorized');
              await auth.signOut();
              router.push('/auth/admin');
            }
          } else {
            setAuthStatus('unauthorized');
            await auth.signOut();
            router.push('/auth/admin');
          }
        } catch (error) {
            console.error("Error al verificar el rol del admin:", error);
            setAuthStatus('unauthorized');
            await auth.signOut();
            router.push('/auth/admin');
        }
      };
      checkUserStatus();
    } else {
      setAuthStatus('unauthorized');
      router.push('/auth/admin');
    }
  }, [user, isUserLoading, router, auth, firestore]);

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };
  
  if (authStatus === 'loading' || authStatus === 'unauthorized') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (authStatus === 'needs_password_change') {
    return <ForceChangePassword onPasswordChanged={() => setAuthStatus('authorized')} />;
  }

  // Once authorized, render the layout of the panel
  const title = pageTitles[pathname] || 'Administración';

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <div className="flex flex-1 flex-col">
        <Header onMenuClick={handleMenuClick} title={title} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
