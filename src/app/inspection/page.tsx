'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, FirebaseClientProvider } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Importar componentes de Header y Footer
import Header from './components/Header';
import Footer from './components/Footer';

// Importar componentes principales
import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuTablet from './components/MainMenuTablet';
import MainMenuMobile from './components/MainMenuMobile';

// Importar constantes de pestañas
import TABS from './constants';

// Hook para detectar el tamaño de la pantalla
import { useScreenSize } from '@/hooks/use-screen-size';
import { Loader2 } from 'lucide-react';

// Lazy loading components
const InspectionFormTab = React.lazy(() => import('./components/InspectionFormTab'));
const TasksTab = React.lazy(() => import('./components/TasksTab'));
const ExpensesTab = React.lazy(() => import('./components/ExpensesTab'));
const ProfileTab = React.lazy(() => import('./components/ProfileTab'));


const InspectionPageContent = () => {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const screenSize = useScreenSize();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    if (isUserLoading) return; // Wait until user status is resolved

    if (user && user.email) {
      // User is logged in, check their role
      const checkInspectorRole = async () => {
        const userDocRef = doc(db, 'usuarios', user.email!);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists() || !userDocSnap.data().roles?.includes('inspector')) {
          // If profile doesn't exist or doesn't have inspector role, sign out and redirect
          await auth.signOut();
          router.push('/auth/inspection');
        }
      };
      checkInspectorRole();
    } else {
      // User is not logged in, redirect to login
      router.push('/auth/inspection');
    }
  }, [user, isUserLoading, router, auth]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleStartInspection = (task: any) => {
    setSelectedTask(task);
    setActiveTab(TABS.NEW_INSPECTION);
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center">
        <div className="flex items-center gap-3">
          <h1 className="font-black text-2xl tracking-tighter text-slate-800">ENERGY</h1>
          <h1 className="font-black text-2xl tracking-tighter text-amber-500">ENGINE</h1>
        </div>
        <p className="text-slate-500 font-medium mt-2">Cargando panel de control...</p>
        <Loader2 className="animate-spin mt-4" />
      </div>
    );
  }

  const renderContent = () => {
    if (!hasMounted) return null;

    if (activeTab === TABS.MENU) {
      switch (screenSize) {
        case 'mobile':
          return <MainMenuMobile onNavigate={handleNavigate} userName={user?.displayName || 'Admin'} />;
        case 'tablet':
          return <MainMenuTablet onNavigate={handleNavigate} userName={user?.displayName || 'Admin'} />;
        case 'desktop':
          return <MainMenuDesktop onNavigate={handleNavigate} userName={user?.displayName || 'Admin'} />;
        default:
          return null;
      }
    }

    let TabComponent: React.ElementType;
    let props: any = {};
    
    switch (activeTab) {
        case TABS.NEW_INSPECTION: 
          TabComponent = InspectionFormTab;
          props = { task: selectedTask };
          break;
        case TABS.TASKS: 
          TabComponent = TasksTab;
          props = { onStartInspection: handleStartInspection };
          break;
        case TABS.EXPENSES: 
          TabComponent = ExpensesTab; 
          break;
        case TABS.PROFILE: 
          TabComponent = ProfileTab; 
          break;
        default: return <p>Pestaña no encontrada</p>;
    }

    return (
        <div className="animate-in slide-in-from-right duration-300">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
              <TabComponent {...props} />
            </Suspense>
        </div>
    );
  };

  return (
    <main className="bg-slate-100 min-h-screen flex flex-col">
      <Header 
        activeTab={activeTab} 
        isOnline={isOnline} 
        onNavigate={handleNavigate} 
      />
      
      <div className="flex-grow">
        {renderContent()}
      </div>
      
      {activeTab === TABS.MENU && <Footer />}
    </main>
  );
}

// --- COMPONENTE DE LA PÁGINA DE INSPECCIÓN ---
export default function InspectionPage() {
    return (
        <FirebaseClientProvider>
            <InspectionPageContent />
        </FirebaseClientProvider>
    )
}