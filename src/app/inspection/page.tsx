'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useUser } from '@/firebase';
import { Loader2, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import Header from './components/Header';
import Footer from './components/Footer';

import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuTablet from './components/MainMenuTablet';
import MainMenuMobile from './components/MainMenuMobile';
import InspectionHub from './components/InspectionHub';

import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';
import { processDictation, ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';

import { 
  TasksTabLazy, 
  RegistroJornadaForm, 
  ProfileTabLazy,
  HojaTrabajoFormLazy,
  InformeTecnicoFormLazy,
  InformeRevisionFormLazy,
  InformeSimplificadoFormLazy
} from './lazy-tabs';


type FormType = 'hoja-trabajo' | 'informe-tecnico' | 'informe-revision' | 'informe-simplificado';

const InspectionPageContent = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [activeInspectionForm, setActiveInspectionForm] = useState<FormType | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const screenSize = useScreenSize();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // --- PWA Install State ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // --- Global Dictation State ---
  const [isDictating, setIsDictating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<ProcessDictationOutput | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setHasMounted(true);
    
    const handleInstallPrompt = (e: Event) => {
<<<<<<< HEAD
        e.preventDefault();
=======
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        setInstallPrompt(e);
    };

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('beforeinstallprompt', handleInstallPrompt);

<<<<<<< HEAD
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => console.log('Service Worker registered.', registration.scope))
          .catch((error) => console.error('Service Worker registration failed:', error));
      }

=======
      // --- Service Worker Registration ---
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered successfully with scope: ', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed: ', error);
          });
      }
      // --- End of Service Worker Registration ---

      // --- Initialize Speech Recognition ---
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'es-ES';
        recognition.interimResults = false;

        recognition.onresult = async (event: any) => {
            let fullTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    fullTranscript += event.results[i][0].transcript;
                }
            }
            
            if (fullTranscript) {
                console.log('Dictado final capturado:', fullTranscript);
                setAiLoading(true);
                recognition.stop(); 
                setIsDictating(false);
                try {
                    const res = await processDictation({ dictation: fullTranscript });
                    setAiData(res);
                    toast({
                      title: "IA ha procesado el dictado",
                      description: "Los campos del formulario han sido actualizados.",
                    });
                } catch (e) {
                    console.error("AI dictation processing failed:", e);
                    toast({
                      variant: "destructive",
                      title: "Error de la IA",
                      description: "La IA no pudo procesar el dictado. Inténtalo de nuevo.",
                    });
                } finally {
                    setAiLoading(false);
                }
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Error de reconocimiento de voz:', event.error);
            if (event.error === 'no-speech') {
                toast({
                    variant: "destructive",
                    title: "No se detectó audio",
                    description: "Inténtalo de nuevo y asegúrate de hablar cerca del micrófono.",
                });
            } else if (event.error !== 'aborted') {
                toast({
                    variant: "destructive",
                    title: "Error de Micrófono",
                    description: "No se pudo iniciar el dictado. Revisa los permisos del micrófono en tu navegador.",
                });
            }
            setIsDictating(false);
        };
        
        recognition.onend = () => {
<<<<<<< HEAD
=======
            // This ensures the button state is correct if recognition stops on its own
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
            setIsDictating(false);
        };

        recognitionRef.current = recognition;
      }
<<<<<<< HEAD
=======
      // --- End of Speech Recognition Init ---
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
      };
    }
  }, [toast]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (tab !== TABS.NEW_INSPECTION) {
      setActiveInspectionForm(null);
    }
  };

  const handleSelectInspectionType = (formType: FormType, data?: any) => {
    setSelectedTask(data);
    setActiveInspectionForm(formType);
<<<<<<< HEAD
    setActiveTab(TABS.NEW_INSPECTION); // Navega a la pestaña de inspección
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  };
  
  const handleStartInspectionFromTask = (task: any) => {
    setSelectedTask(task);
<<<<<<< HEAD
    // Asume un tipo de formulario por defecto o extrae el tipo de la tarea
    setActiveInspectionForm('informe-revision'); 
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
    setActiveTab(TABS.NEW_INSPECTION);
  };

  const handleBackToHub = () => {
    setActiveInspectionForm(null);
<<<<<<< HEAD
    // Al limpiar el formulario activo, la vista vuelve al "Hub" de selección
    // siempre que la pestaña activa siga siendo TABS.NEW_INSPECTION.
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  }

  const handleInstallClick = () => {
    if (!installPrompt) {
      toast({
        variant: "destructive",
        title: "Instalación no disponible",
        description: "Tu navegador no ha habilitado la instalación o la app ya está instalada.",
      });
      return;
    }
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        setInstallPrompt(null);
    });
  };

  const toggleDictation = () => {
<<<<<<< HEAD
      if (!isOnline) {
          toast({ variant: "destructive", title: "Sin Conexión", description: "El dictado por IA requiere conexión a internet." });
          return;
      }
      if (!recognitionRef.current) {
          toast({ variant: "destructive", title: "Navegador no compatible", description: "El dictado por voz no funciona en este navegador. Prueba con Chrome." });
          return;
      }
      if (isDictating) {
          recognitionRef.current.stop();
          setIsDictating(false);
      } else {
          setAiData(null);
          recognitionRef.current.start();
          setIsDictating(true);
      }
  };

  const renderFloatingDictationButton = () => {
=======
    if (!isOnline) {
        toast({ variant: "destructive", title: "Sin Conexión", description: "El dictado por IA requiere conexión a internet." });
        return;
    }
    if (!recognitionRef.current) {
        toast({ variant: "destructive", title: "Navegador no compatible", description: "El dictado por voz no funciona en este navegador. Prueba con Chrome." });
        return;
    }
    if (isDictating) {
        recognitionRef.current.stop();
        setIsDictating(false); // Manually set state, onend can be slow
    } else {
        setAiData(null); // Reset previous data on new dictation
        recognitionRef.current.start();
        setIsDictating(true);
    }
  };

  const renderFloatingDictationButton = () => {
      // Show only on data-heavy forms that benefit from global dictation
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      const supportedForms: FormType[] = ['hoja-trabajo', 'informe-tecnico', 'informe-revision', 'informe-simplificado'];
      if (!activeInspectionForm || !supportedForms.includes(activeInspectionForm)) {
          return null;
      }

      return (
          <button
              onClick={toggleDictation}
              className={`fixed bottom-28 md:bottom-10 right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all duration-300 transform active:scale-90
<<<<<<< HEAD
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-primary'}
=======
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
              ${aiLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
              disabled={aiLoading}
              aria-label={isDictating ? 'Detener dictado' : 'Iniciar dictado'}
          >
              {aiLoading ? <Loader2 className="animate-spin" size={28}/> : isDictating ? <Square size={24}/> : <Mic size={28}/>}
          </button>
      );
  };

  if (!user) {
<<<<<<< HEAD
     return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;
=======
     return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderContent = () => {
    if (!hasMounted) return null;
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

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
<<<<<<< HEAD
          return <div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;
=======
          return <div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      }
    }

    if (activeTab === TABS.NEW_INSPECTION) {
        if (!activeInspectionForm) {
            return <InspectionHub onSelectInspectionType={handleSelectInspectionType} />;
        }
        
        let FormComponent;
        switch (activeInspectionForm) {
            case 'hoja-trabajo': FormComponent = HojaTrabajoFormLazy; break;
            case 'informe-tecnico': FormComponent = InformeTecnicoFormLazy; break;
            case 'informe-revision': FormComponent = InformeRevisionFormLazy; break;
            case 'informe-simplificado': FormComponent = InformeSimplificadoFormLazy; break;
            default: return <p>Formulario no encontrado</p>;
        }

        return (
<<<<<<< HEAD
            <Suspense fallback={<div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
=======
            <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
                <FormComponent initialData={selectedTask} aiData={aiData} />
            </Suspense>
        );
    }

    let TabComponent: React.ElementType;
    let props: any = {};
    
    switch (activeTab) {
        case TABS.TASKS: TabComponent = TasksTabLazy; props = { onStartInspection: handleStartInspectionFromTask }; break;
        case TABS.EXPENSES: TabComponent = RegistroJornadaForm; break;
        case TABS.PROFILE: TabComponent = ProfileTabLazy; break;
        default: return <p>Pestaña no encontrada</p>;
    }

    return (
<<<<<<< HEAD
      <Suspense fallback={<div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
        <TabComponent {...props} />
      </Suspense>
=======
        <div className="animate-in slide-in-from-right duration-300 w-full max-w-4xl mx-auto">
            <Suspense fallback={<div className="flex h-full items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
              <TabComponent {...props} />
            </Suspense>
        </div>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
    );
  };

  return (
<<<<<<< HEAD
    <div className="flex flex-col min-h-screen bg-slate-50">
=======
    <main className="bg-slate-100 min-h-screen flex flex-col">
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      <Header 
        activeTab={activeTab}
        isSubNavActive={!!activeInspectionForm}
        onBack={activeInspectionForm ? handleBackToHub : () => handleNavigate(TABS.MENU)}
        isOnline={isOnline}
        onInstall={handleInstallClick}
<<<<<<< HEAD
        canInstall={!!installPrompt}
      />
      <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
      {renderFloatingDictationButton()}
      <Footer activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
=======
        canInstall={true}
      />
      <div className="flex-grow">
        {renderContent()}
      </div>
      {renderFloatingDictationButton()}
      {activeTab === TABS.MENU && <Footer />}
    </main>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  );
}

export default function InspectionPage() {
    return <InspectionPageContent />;
}
