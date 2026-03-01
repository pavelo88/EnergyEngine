'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

import Header from './components/Header';
import Footer from './components/Footer';

import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuTablet from './components/MainMenuTablet';
import MainMenuMobile from './components/MainMenuMobile';
import InspectionHub from './components/InspectionHub';

import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';

import { 
  TasksTabLazy, 
  ExpensesTabLazy, 
  ProfileTabLazy,
  AlbaranFormLazy,
  InformeTecnicoFormLazy,
  HojaRevisionFormLazy,
  RevisionBasicaFormLazy,
} from './lazy-tabs';


type FormType = 'albaran' | 'informe-tecnico' | 'hoja-revision' | 'revision-basica';

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

    if (activeTab === TABS.NEW_INSPECTION) {
        if (!activeInspectionForm) {
            return <InspectionHub onSelectInspectionType={handleSelectInspectionType} />;
        }
        
        let FormComponent;
        switch (activeInspectionForm) {
            case 'albaran': FormComponent = AlbaranFormLazy; break;
            case 'informe-tecnico': FormComponent = InformeTecnicoFormLazy; break;
            case 'hoja-revision': FormComponent = HojaRevisionFormLazy; break;
            case 'revision-basica': FormComponent = RevisionBasicaFormLazy; break;
            default: return <p>Formulario no encontrado</p>;
        }

        return (
            <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
                <FormComponent initialData={selectedTask} />
            </Suspense>
        );
    }

    let TabComponent: React.ElementType;
    let props: any = {};
    
    switch (activeTab) {
        case TABS.TASKS: TabComponent = TasksTabLazy; props = { onStartInspection: handleStartInspectionFromTask }; break;
        case TABS.EXPENSES: TabComponent = ExpensesTabLazy; break;
        case TABS.PROFILE: TabComponent = ProfileTabLazy; break;
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
