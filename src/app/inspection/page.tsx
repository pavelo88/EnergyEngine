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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>(TABS.MENU);
  const [activeInspectionForm, setActiveInspectionForm] = useState<FormType | null>(null);
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
    if (typeof window !== "undefined") {
      const handleInstallPrompt = (e: any) => {
          e.preventDefault();
          setInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    }
  }, []);

  // Función de sincronización estabilizada
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

            let inspectorSignatureUrl = null;
            if (inspectorSignature && inspectorSignature.startsWith('data:')) {
                const inspRef = ref(storage, `firmas/${docId}/inspector.png`);
                await uploadString(inspRef, inspectorSignature, 'data_url');
                inspectorSignatureUrl = await getDownloadURL(inspRef);
            }

            let clientSignatureUrl = null;
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
            console.error('Failed to sync record:', record.id, itemError);
          }
        }
      }
    } catch (error) {
      console.error('Sincronización general fallida:', error);
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

  const handleSelectInspectionType = (formType: FormType, data?: any) => {
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
    if (activeInspectionForm) setActiveInspectionForm(null);
    else setActiveTab(TABS.MENU);
  }

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const toggleDictation = () => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          toast({ variant: "destructive", title: "Error", description: "Voz no compatible." });
          return;
      }
      if (isDictating) {
          recognitionRef.current?.stop();
          setIsDictating(false);
      } else {
          dictationBufferRef.current = '';
          const recognition = new SpeechRecognition();
          recognition.lang = 'es-ES';
          recognition.continuous = true;
          recognition.onresult = (event: any) => {
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                  if (event.results[i].isFinal) dictationBufferRef.current += event.results[i][0].transcript + ' ';
              }
          };
          recognition.onend = async () => {
              if (dictationBufferRef.current.trim()) {
                  setAiLoading(true);
                  try {
                      const res = await processDictation({ dictation: dictationBufferRef.current });
                      setAiData(res);
                      toast({ title: "Voz procesada" });
                  } catch (e) {
                      console.error("AI Fallback active:", e);
                      // Fallback robusto si la clave de API falla
                      setAiData({
                          observations_summary: dictationBufferRef.current,
                          identidad: {}, all_ok: false, checklist_updates: {}, mediciones_generales: {}, pruebas_carga: {}
                      } as any);
                      toast({ 
                        variant: "destructive", 
                        title: "Modo Manual", 
                        description: "IA fuera de servicio por clave de API. Usando dictado directo." 
                      });
                  } finally {
                      setAiLoading(false);
                  }
              }
          };
          recognitionRef.current = recognition;
          recognition.start();
          setIsDictating(true);
          toast({ title: "Escuchando..." });
      }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (activeTab === TABS.MENU) {
      const name = user?.displayName || user?.email?.split('@')[0] || 'Técnico';
      if (screenSize === 'desktop' || screenSize === 'tablet') return <MainMenuDesktop onNavigate={handleNavigate} userName={name} />;
      return <MainMenuMobile onNavigate={handleNavigate} userName={name} />;
    }

    let Component;
    let props: any = {};

    if (activeTab === TABS.NEW_INSPECTION) {
        if (!activeInspectionForm) return <div className="w-full h-full p-4"><InspectionHub onSelectInspectionType={handleSelectInspectionType} /></div>;
        
        switch (activeInspectionForm) {
            case 'hoja-trabajo': Component = HojaTrabajoFormLazy; break;
            case 'informe-tecnico': Component = InformeTecnicoFormLazy; break;
            case 'informe-revision': Component = InformeRevisionFormLazy; break;
            case 'informe-simplificado': Component = InformeSimplificadoFormLazy; break;
            case 'revision-basica': Component = RevisionBasicaFormLazy; break;
            default: Component = InformeTecnicoFormLazy;
        }
        props = { initialData: selectedTask, aiData: aiData };
    } else {
        switch (activeTab) {
            case TABS.TASKS: Component = TasksTabLazy; props = { onStartInspection: handleStartInspectionFromTask }; break;
            case TABS.EXPENSES: Component = RegistroJornadaForm; break;
            case TABS.PROFILE: Component = ProfileTabLazy; break;
            default: return <p>No encontrado</p>;
        }
    }

    return (
      <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>}>
        <div className="w-full h-full px-4 py-6">
          <Component {...props} />
        </div>
      </Suspense>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
      <Header 
        activeTab={activeTab}
        isSubNavActive={!!activeInspectionForm}
        onBack={handleBackToHub}
        isOnline={isOnline}
        onInstall={handleInstallClick}
        canInstall={!!installPrompt}
      />
      <main className="flex-grow w-full relative">
         {renderContent()}
      </main>
      
      {activeInspectionForm && (
          <button
              onClick={toggleDictation}
              className={`fixed bottom-24 right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all transform active:scale-90
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
    return <InspectionPageContent />;
}
