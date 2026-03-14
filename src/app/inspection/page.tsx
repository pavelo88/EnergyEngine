
'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { Loader2, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadString } from 'firebase/storage';
import { db as dbLocal } from '@/lib/db-local';

import Header from './components/Header';
import Footer from './components/Footer';

import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuMobile from './components/MainMenuMobile';
import InspectionHub from './components/InspectionHub';

import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';
import { processDictation, ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSearchParams } from 'next/navigation';

import { 
  TasksTabLazy, 
  RegistroJornadaForm, 
  ProfileTabLazy,
  HojaTrabajoFormLazy,
  InformeTecnicoFormLazy,
  InformeRevisionFormLazy,
  InformeSimplificadoFormLazy,
  RevisionBasicaFormLazy
} from './lazy-tabs';

type FormType = 'hoja-trabajo' | 'informe-tecnico' | 'informe-revision' | 'informe-simplificado' | 'revision-basica';

const InspectionPageContent = () => {
  const { user, firestore, isUserLoading } = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [activeInspectionForm, setActiveInspectionForm] = useState<FormType | null>(null);

  useEffect(() => {
    const formParam = searchParams.get('form') as FormType;
    if (formParam && ['hoja-trabajo', 'informe-tecnico', 'informe-revision', 'informe-simplificado', 'revision-basica'].includes(formParam)) {
        setActiveInspectionForm(formParam);
        setActiveTab(TABS.NEW_INSPECTION);
    }
  }, [searchParams]);
  const isOnline = useOnlineStatus();
  const screenSize = useScreenSize();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [isDictating, setIsDictating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<ProcessDictationOutput | null>(null);
  const recognitionRef = useRef<any>(null);
  const dictationBufferRef = useRef<string>('');

  useEffect(() => {
    setHasMounted(true);
    
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('SW registrado con éxito:', registration.scope);
          },
          (err) => {
            console.log('Fallo en registro de SW:', err);
          }
        );
      });
    }

    if (typeof window !== "undefined") {
      const handleInstallPrompt = (e: any) => {
          e.preventDefault();
          setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing || !user || !firestore) return;
    
    setIsSyncing(true);
    const storage = getStorage();

    try {
      const pendingHojas = await dbLocal.hojas_trabajo.filter(record => !record.synced).toArray();
      if (pendingHojas.length > 0) {
        for (const record of pendingHojas) {
          try {
            const { images, inspectorSignature, clientSignature, originalJobId, ...formDataForFirebase } = record.data;
            const docId = record.firebaseId || `SYNC-${Date.now()}`;

            let inspectorSignatureUrl = record.data.inspectorSignatureUrl;
            if (inspectorSignature && inspectorSignature.startsWith('data:')) {
                const inspRef = ref(storage, `firmas/${docId}/inspector.png`);
                await uploadString(inspRef, inspectorSignature, 'data_url');
                inspectorSignatureUrl = await getDownloadURL(inspRef);
            }

            let clientSignatureUrl = record.data.clientSignatureUrl;
            if (clientSignature && clientSignature.startsWith('data:')) {
                const cliRef = ref(storage, `firmas/${docId}/cliente.png`);
                await uploadString(cliRef, clientSignature, 'data_url');
                clientSignatureUrl = await getDownloadURL(cliRef);
            }
            
            const docData = { ...formDataForFirebase, inspectorSignatureUrl, clientSignatureUrl, id: docId, fecha_creacion: Timestamp.now() };
            await setDoc(doc(firestore, 'trabajos', docId), docData);

            if (originalJobId) {
              await updateDoc(doc(firestore, 'trabajos', originalJobId), { estado: 'Completado' });
            }
            
            await dbLocal.hojas_trabajo.update(record.id!, { synced: true, firebaseId: docId });
          } catch (itemError) {
            console.error('Sincronización de registro fallida:', record.id, itemError);
          }
        }
      }
    } catch (error) {
      console.error('Error de sincronización:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, user, firestore]);

  useEffect(() => {
    if (isOnline && hasMounted) {
      syncOfflineData();
    }
  }, [isOnline, hasMounted, syncOfflineData]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (tab !== TABS.NEW_INSPECTION) setActiveInspectionForm(null);
  };

  const handleSelectInspectionType = (formType: any, data?: any) => {
    setSelectedTask(data);
    setActiveInspectionForm(formType);
    setActiveTab(TABS.NEW_INSPECTION);
  };
  
  const handleStartInspectionFromTask = (task: any) => {
    setSelectedTask(task);
    setActiveInspectionForm(task.formType || 'informe-tecnico'); 
    setActiveTab(TABS.NEW_INSPECTION);
  };

  const handleBackToHub = () => {
    setActiveInspectionForm(null);
    setActiveTab(TABS.MENU);
  }

  const handleFormSuccess = () => {
    setActiveInspectionForm(null);
    setSelectedTask(null);
    setAiData(null);
    setActiveTab(TABS.MENU);
  };

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const isDictatingRef = useRef(false);

  const toggleDictation = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          toast({ variant: "destructive", title: "Función no compatible", description: "El dictado por voz no está disponible en este navegador." });
          return;
      }

      if (isDictating) {
          // 1. Disable auto-restart ref FIRST
          isDictatingRef.current = false;
          setIsDictating(false);
          // 2. Stop recognition — last words arrive in onresult before onend fires
          recognitionRef.current?.stop();
          // 3. Give 400ms for last onresult to fire, then process
          setTimeout(() => {
              processFinalDictation();
          }, 400);
      } else {
          dictationBufferRef.current = '';
          isDictatingRef.current = true;
          setIsDictating(true);
          startRecognition();
          toast({ title: "Escuchando...", description: "Hable con claridad. Se mantendrá activo hasta que pulse parar." });
      }
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                dictationBufferRef.current += event.results[i][0].transcript + ' ';
            }
        }
    };

    recognition.onend = () => {
        // Only restart if user hasn't pressed STOP
        if (isDictatingRef.current) {
            setTimeout(() => {
              if (isDictatingRef.current) {
                try { recognition.start(); } catch(err) {}
              }
            }, 100);
        }
    };

    recognition.onerror = (e: any) => {
        // Ignore aborted errors (from stop()), restart on network errors
        if (e.error === 'aborted' || e.error === 'not-allowed') return;
        if (isDictatingRef.current) {
            setTimeout(() => {
              if (isDictatingRef.current) {
                try { recognition.start(); } catch(err) {}
              }
            }, 500);
        }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch(e) {
      console.error("Start failed:", e);
    }
  };

  const processFinalDictation = async () => {
      const text = dictationBufferRef.current.trim();
      console.log('[DICTATION] processFinalDictation fired. Buffer length:', text.length, '| Text:', text.substring(0, 100));
      
      if (!text) {
          console.warn('[DICTATION] Buffer is EMPTY — speech was not captured. Check mic permissions.');
          toast({ variant: "destructive", title: "Sin texto", description: "No se capturó ningún audio. Verifique permisos del micrófono." });
          return;
      }

      setAiLoading(true);
      console.log('[DICTATION] Calling AI server action...');
      try {
          const res = await processDictation({ dictation: text });
          console.log('[DICTATION] AI response received:', res);
          setAiData(res);
          toast({ title: "Voz Procesada ✓", description: "La IA ha rellenado el formulario con tu dictado." });
      } catch (e) {
          console.error("[DICTATION] AI call failed:", e);
          // Fallback: use raw text so user doesn't lose dictation
          setAiData({
              observations_summary: text,
              identidad: {}, all_ok: false, checklist_updates: {}, mediciones_generales: {}, pruebas_carga: {}
          } as any);
          toast({ variant: "destructive", title: "IA Fuera de Servicio", description: "Texto volcado manualmente al formulario." });
      } finally {
          setAiLoading(false);
      }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    if (activeTab === TABS.MENU) {
      const name = user?.displayName || user?.email?.split('@')[0] || 'Técnico';
      
      return (
        <div className="w-full max-w-4xl mx-auto px-4">
          {(screenSize === 'desktop' || screenSize === 'tablet') ? (
            <MainMenuDesktop onNavigate={handleNavigate} onSelectInspection={handleSelectInspectionType} userName={name} />
          ) : (
            <MainMenuMobile onNavigate={handleNavigate} onSelectInspection={handleSelectInspectionType} userName={name} />
          )}
        </div>
      );
    }

    let Component;
    let props: any = {};

    if (activeTab === TABS.NEW_INSPECTION) {
        if (!activeInspectionForm) return <div className="w-full h-full max-w-4xl mx-auto"><InspectionHub onSelectInspectionType={handleSelectInspectionType} /></div>;
        
        switch (activeInspectionForm) {
            case 'hoja-trabajo': Component = HojaTrabajoFormLazy; break;
            case 'informe-tecnico': Component = InformeTecnicoFormLazy; break;
            case 'informe-revision': Component = InformeRevisionFormLazy; break;
            case 'informe-simplificado': Component = InformeSimplificadoFormLazy; break;
            case 'revision-basica': Component = RevisionBasicaFormLazy; break;
            default: Component = InformeTecnicoFormLazy;
        }
        props = { initialData: selectedTask, aiData: aiData, onSuccess: handleFormSuccess };
    } else {
        switch (activeTab) {
            case TABS.TASKS: Component = TasksTabLazy; props = { onStartInspection: handleStartInspectionFromTask }; break;
            case TABS.EXPENSES: Component = RegistroJornadaForm; break;
            case TABS.PROFILE: Component = ProfileTabLazy; break;
            default: return <p className="text-center py-20 text-slate-400">Componente no encontrado</p>;
        }
    }

    return (
      <Suspense fallback={<div className="py-40 flex flex-col items-center justify-center gap-4 text-slate-400 font-bold"><Loader2 className="animate-spin text-primary" size={40} /> CARGANDO MÓDULO...</div>}>
        <div className="w-full h-full max-w-4xl mx-auto">
          <Component {...props} />
        </div>
      </Suspense>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      <Header 
        activeTab={activeTab}
        isSubNavActive={!!activeInspectionForm}
        onBack={handleBackToHub}
        isOnline={isOnline}
        onInstall={handleInstallClick}
        canInstall={!!installPrompt}
      />
      
      <main className="flex-grow w-full pt-20 pb-32 md:pb-40 lg:pb-48 px-2 md:px-0">
         {renderContent()}
      </main>
      
      {activeInspectionForm && (
          <button
              onClick={toggleDictation}
              className={`fixed bottom-24 right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all transform active:scale-90 hover:scale-105
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-primary'} ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={aiLoading}
          >
              {aiLoading ? <Loader2 className="animate-spin" size={28}/> : isDictating ? <Square size={24}/> : <Mic size={28}/>}
          </button>
      )}
      
      <Footer activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}

export default function InspectionPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <InspectionPageContent />
        </Suspense>
    );
}
