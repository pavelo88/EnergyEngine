'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

// Importar componentes de Header y Footer
import Header from './components/Header';
import Footer from './components/Footer';

// Importar componentes principales del menú y el nuevo HUB
import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuTablet from './components/MainMenuTablet';
import MainMenuMobile from './components/MainMenuMobile';
import InspectionHub from './components/InspectionHub'; // <-- NUEVO

// Importar constantes de pestañas y hook de tamaño de pantalla
import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';

// Lazy loading para las pestañas de contenido
const InspectionFormTab = React.lazy(() => import('./components/InspectionFormTab'));
const TasksTab = React.lazy(() => import('./components/TasksTab'));
const ExpensesTab = React.lazy(() => import('./components/ExpensesTab'));
const ProfileTab = React.lazy(() => import('./components/ProfileTab'));

// --- TIPOS ---
type FormType = 'albaran' | 'informe-trabajo' | 'hoja-revision' | 'revision-basica';

const InspectionPageContent = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [activeInspectionForm, setActiveInspectionForm] = useState<FormType | null>(null);
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
    // Si navegamos a cualquier otra pestaña, reseteamos la selección de formulario de inspección
    if (tab !== TABS.NEW_INSPECTION) {
      setActiveInspectionForm(null);
    }
  };

  const handleSelectInspectionType = (formType: FormType, data?: any) => {
    setSelectedTask(data);
    setActiveInspectionForm(formType);
  };
  
  const handleStartInspectionFromTask = (task: any) => {
    setSelectedTask(task);
    setActiveTab(TABS.NEW_INSPECTION);
  };

  const handleBackToHub = () => {
    setActiveInspectionForm(null);
  }

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
          return <div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;
      }
    }

    // Lógica para la pestaña de "Inspección"
    if (activeTab === TABS.NEW_INSPECTION) {
      return (
        <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
          {activeInspectionForm ? (
            <InspectionFormTab formType={activeInspectionForm} initialData={selectedTask} />
          ) : (
            <InspectionHub onSelectInspectionType={handleSelectInspectionType} />
          )}
        </Suspense>
      );
    }

    // Renderizado del resto de las pestañas
    let TabComponent: React.ElementType;
    let props: any = {};
    
    switch (activeTab) {
        case TABS.TASKS: 
          TabComponent = TasksTab;
          props = { onStartInspection: handleStartInspectionFromTask };
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
        <div className="animate-in slide-in-from-right duration-300 w-full max-w-4xl mx-auto">
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
        isSubNavActive={!!activeInspectionForm}
        onBack={activeInspectionForm ? handleBackToHub : () => handleNavigate(TABS.MENU)}
        isOnline={isOnline}
      />
      <div className="flex-grow">
        {renderContent()}
      </div>
      {activeTab === TABS.MENU && <Footer />}
    </main>
  );
}

export default function InspectionPage() {
    return <InspectionPageContent />;
}
