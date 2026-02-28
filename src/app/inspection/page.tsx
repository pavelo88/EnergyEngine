'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

// Importar componentes de Header y Footer
import Header from './components/Header';
import Footer from './components/Footer';

// Importar componentes principales del menú
import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuTablet from './components/MainMenuTablet';
import MainMenuMobile from './components/MainMenuMobile';

// Importar constantes de pestañas y hook de tamaño de pantalla
import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';

// Lazy loading para las pestañas de contenido
const InspectionFormTab = React.lazy(() => import('./components/InspectionFormTab'));
const TasksTab = React.lazy(() => import('./components/TasksTab'));
const ExpensesTab = React.lazy(() => import('./components/ExpensesTab'));
const ProfileTab = React.lazy(() => import('./components/ProfileTab'));

const InspectionPageContent = () => {
  const { user } = useUser(); // El layout ya se encarga de la autorización
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [isOnline, setIsOnline] = useState(true);
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

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
  };

  const handleStartInspection = (task: any) => {
    setSelectedTask(task);
    setActiveTab(TABS.NEW_INSPECTION);
  };

  // El loader principal ya está en el layout, aquí podemos poner uno más específico si es necesario
  if (!user) {
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderContent = () => {
    if (!hasMounted) return null;

    if (activeTab === TABS.MENU) {
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Inspector';
      switch (screenSize) {
        case 'mobile':
          return <MainMenuMobile onNavigate={handleNavigate} userName={userName} />;
        case 'tablet':
          return <MainMenuTablet onNavigate={handleNavigate} userName={userName} />;
        case 'desktop':
          return <MainMenuDesktop onNavigate={handleNavigate} userName={userName} />;
        default:
          return null; // O un loader genérico
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
            <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
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
      <div className="flex-grow p-4 sm:p-6 md:p-8">
        {renderContent()}
      </div>
      {activeTab === TABS.MENU && <Footer />}
    </main>
  );
}


export default function InspectionPage() {
    // El FirebaseClientProvider ya está en el layout.tsx raíz, no es necesario aquí.
    // El InspectionLayout se encargará de la protección de la ruta.
    return <InspectionPageContent />;
}
