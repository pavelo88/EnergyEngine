'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/app/admin/components/Sidebar';
import Header from '@/app/admin/components/Header';
import { useUser, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';


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
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); // Nuevo estado de autorización

  useEffect(() => {
    if (isUserLoading) return; // Esperar a que se resuelva el estado del usuario

    if (user && user.email) {
      // El usuario está logueado, verificar su rol
      const checkAdminRole = async () => {
        try {
          const userDocRef = doc(db, 'usuarios', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists() && userDocSnap.data().roles?.includes('admin')) {
            setIsAuthorized(true); // El usuario es un admin autorizado
          } else {
            // Si el perfil no existe o no tiene el rol de admin, expulsarlo
            await auth.signOut();
            router.push('/auth/admin');
          }
        } catch (error) {
            console.error("Error al verificar el rol del admin:", error);
            await auth.signOut();
            router.push('/auth/admin');
        }
      };
      checkAdminRole();
    } else {
      // El usuario no está logueado, redirigir al login de admin
      router.push('/auth/admin');
    }
  }, [user, isUserLoading, router, auth]);

  const handleMenuClick = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };
  
  // Muestra un loader mientras se verifica la autenticación y autorización
  if (isUserLoading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    )
  }

  // Una vez autorizado, renderiza el layout del panel
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
