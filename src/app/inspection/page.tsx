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
  AlbaranFormLazy,
  InformeTecnicoFormLazy,
  HojaRevisionFormLazy,
  RevisionBasicaFormLazy,
} from './lazy-tabs';


type FormType = 'albaran' | 'informe-tecnico' | 'hoja-revision' | 'revision-basica';

const InspectionPageContent = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [activeInspectionForm, setActiveInspectionForm] = useState<FormType | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const screenSize = useScreenSize();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // --- Global Dictation State ---
  const [isDictating, setIsDictating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<ProcessDictationOutput | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // --- Initialize Speech Recognition ---
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
            // This ensures the button state is correct if recognition stops on its own
            setIsDictating(false);
        };

        recognitionRef.current = recognition;
      }
      // --- End of Speech Recognition Init ---

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
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
  };
  
  const handleStartInspectionFromTask = (task: any) => {
    setSelectedTask(task);
    setActiveTab(TABS.NEW_INSPECTION);
  };

  const handleBackToHub = () => {
    setActiveInspectionForm(null);
  }

  const toggleDictation = () => {
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
      const supportedForms: FormType[] = ['albaran', 'hoja-revision', 'informe-tecnico'];
      if (!activeInspectionForm || !supportedForms.includes(activeInspectionForm)) {
          return null;
      }

      return (
          <button
              onClick={toggleDictation}
              className={`fixed bottom-28 md:bottom-10 right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all duration-300 transform active:scale-90
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}
              ${aiLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
              disabled={aiLoading}
              aria-label={isDictating ? 'Detener dictado' : 'Iniciar dictado'}
          >
              {aiLoading ? <Loader2 className="animate-spin" size={28}/> : isDictating ? <Square size={24}/> : <Mic size={28}/>}
          </button>
      );
  };

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
      {renderFloatingDictationButton()}
      {activeTab === TABS.MENU && <Footer />}
    </main>
  );
}

export default function InspectionPage() {
    return <InspectionPageContent />;
}
