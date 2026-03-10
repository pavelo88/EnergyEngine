'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { Loader2, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
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
    const syncOfflineData = async () => {
      if (isOnline && !isSyncing && user && firestore) {
        const storage = getStorage();
        setIsSyncing(true);

        const pendingHojas = await dbLocal.hojas_trabajo.filter(record => !record.synced).toArray();
        const pendingJornadas = await dbLocal.registros_jornada.filter(record => !record.synced).toArray();
        const pendingGastos = await dbLocal.gastos.filter(record => !record.synced).toArray();
        
        const totalPending = pendingHojas.length + pendingJornadas.length + pendingGastos.length;

        if (totalPending > 0) {
          toast({
            title: "Sincronizando...",
            description: `${totalPending} tareas pendientes de subir.`,
          });

          for (const record of pendingHojas) {
            try {
              const dataToSync = record.data;
              const { images, inspectorSignature, clientSignature, originalJobId, ...formDataForFirebase } = dataToSync;
              const formType = formDataForFirebase.formType;

              const trabajosRef = collection(firestore, 'trabajos');
              const qTrabajos = query(trabajosRef, where('formType', '==', formType));
              const trabajosSnapshot = await getDocs(qTrabajos);
              const sequentialNumber = (trabajosSnapshot.size + 1).toString().padStart(3, '0');
              const year = new Date().getFullYear();
              
              let idPrefix = 'DOC';
              if (formType === 'hoja-trabajo') idPrefix = 'HT';
              else if (formType === 'informe-revision') idPrefix = 'IR';
              else if (formType === 'informe-tecnico') idPrefix = 'IT';
              else if (formType === 'informe-simplificado') idPrefix = 'IS';
              else if (formType === 'revision-basica') idPrefix = 'BAS';
              
              const docId = `${idPrefix}-${year}-${sequentialNumber}`;

              const imageUrls = await Promise.all((images || []).map(async (image: File) => {
                  const imageRef = ref(storage, `informes/${docId}/${image.name}`);
                  await uploadBytes(imageRef, image);
                  return await getDownloadURL(imageRef);
              }));

              let inspectorSignatureUrl = null;
              if (inspectorSignature) {
                  const inspRef = ref(storage, `firmas/${docId}/inspector.png`);
                  await uploadString(inspRef, inspectorSignature, 'data_url');
                  inspectorSignatureUrl = await getDownloadURL(inspRef);
              }

              let clientSignatureUrl = null;
              if (clientSignature) {
                  const cliRef = ref(storage, `firmas/${docId}/cliente.png`);
                  await uploadString(cliRef, clientSignature, 'data_url');
                  clientSignatureUrl = await getDownloadURL(cliRef);
              }
              
              const docData = { ...formDataForFirebase, imageUrls, inspectorSignatureUrl, clientSignatureUrl, id: docId, fecha_creacion: Timestamp.now() };
              
              await setDoc(doc(firestore, 'trabajos', docId), docData);

              if (originalJobId) {
                try {
                    const jobRef = doc(firestore, 'trabajos', originalJobId);
                    await updateDoc(jobRef, { estado: 'Completado' });
                } catch (e) { console.error(e); }
              }
              
              await dbLocal.hojas_trabajo.update(record.id!, { synced: true, firebaseId: docId });
            } catch (error) {
              console.error('Failed to sync report:', record.id, error);
            }
          }

          // Jornadas y Gastos
          for (const record of pendingJornadas) {
             try {
                const { signature, ...jornadaData } = record.data;
                const jornadaId = `J-${Date.now().toString().slice(-6)}-${user.uid.slice(0,4)}`;
                const sigRef = ref(storage, `firmas_jornadas/${jornadaId}.png`);
                await uploadString(sigRef, signature, 'data_url');
                const firmaUrl = await getDownloadURL(sigRef);
                const jornadaDocRef = doc(collection(firestore, "jornadas"), jornadaId);
                await setDoc(jornadaDocRef, { ...jornadaData, firmaUrl, id: jornadaDocRef.id, fecha_creacion: serverTimestamp() });
                await dbLocal.registros_jornada.update(record.id!, { synced: true, firebaseId: jornadaId });
             } catch(e) { console.error(e); }
          }

          for (const record of pendingGastos) {
             try {
                const { comprobanteFile, ...gastoData } = record.data;
                const gastoRef = doc(collection(firestore, "gastos"));
                let comprobanteUrl = '';
                if (comprobanteFile) {
                    const fileRef = ref(storage, `comprobantes_gastos/${gastoRef.id}/${comprobanteFile.name}`);
                    await uploadBytes(fileRef, comprobanteFile);
                    comprobanteUrl = await getDownloadURL(fileRef);
                }
                await setDoc(gastoRef, { ...gastoData, comprobanteUrl, fecha_creacion: serverTimestamp() });
                await dbLocal.gastos.update(record.id!, { synced: true, firebaseId: gastoRef.id });
             } catch(e) { console.error(e); }
           }

          toast({ title: "¡Sincronización Completa!", description: "Todos tus datos offline han sido subidos a la nube." });
        }
        setIsSyncing(false);
      }
    };
    syncOfflineData();
  }, [isOnline, isSyncing, user, firestore, toast]);

  useEffect(() => {
    setHasMounted(true);
    
    const handleInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };

    if (typeof window !== "undefined") {
      window.addEventListener('beforeinstallprompt', handleInstallPrompt);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(e => console.log('SW fail:', e));
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'es-ES';
        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) dictationBufferRef.current += event.results[i][0].transcript + ' ';
            }
        };
        recognition.onend = async () => {
            setIsDictating(false);
            const finalText = dictationBufferRef.current.trim();
            if (finalText) {
                setAiLoading(true);
                try {
                    const res = await processDictation({ dictation: finalText });
                    setAiData(res);
                    toast({ title: "Dictado procesado con éxito" });
                } catch (e) {
                    console.error(e);
                    toast({ variant: "destructive", title: "Error en IA", description: "No se pudo procesar el dictado por voz." });
                } finally {
                    setAiLoading(false);
                    dictationBufferRef.current = '';
                }
            }
        };
        recognitionRef.current = recognition;
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
        if (recognitionRef.current) recognitionRef.current.abort();
      };
    }
  }, [toast]);

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
      if (!isOnline) {
          toast({ variant: "destructive", title: "Sin Conexión", description: "El procesamiento de voz requiere internet." });
          return;
      }
      if (!recognitionRef.current) {
          toast({ variant: "destructive", title: "Error", description: "Tu navegador no es compatible con el dictado por voz." });
          return;
      }
      if (isDictating) {
          recognitionRef.current.stop();
          toast({ title: "Procesando dictado..." });
      } else {
          dictationBufferRef.current = '';
          setAiData(null);
          recognitionRef.current.start();
          setIsDictating(true);
          toast({ title: "Escuchando..." });
      }
  };

  const renderFloatingDictationButton = () => {
      if (!activeInspectionForm) return null;
      const bottomPos = screenSize === 'mobile' ? 'bottom-28' : 'bottom-8';
      return (
          <button
              onClick={toggleDictation}
              className={`fixed ${bottomPos} right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all transform active:scale-90
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-primary'}
              ${aiLoading ? 'bg-gray-400' : ''}`}
              disabled={aiLoading}
          >
              {aiLoading ? <Loader2 className="animate-spin" size={28}/> : isDictating ? <Square size={24}/> : <Mic size={28}/>}
          </button>
      );
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;

    if (activeTab === TABS.MENU) {
      const name = user?.displayName || user?.email?.split('@')[0] || 'Inspector';
      if (screenSize === 'desktop' || screenSize === 'tablet') return <MainMenuDesktop onNavigate={handleNavigate} userName={name} />;
      return <MainMenuMobile onNavigate={handleNavigate} userName={name} />;
    }

    if (activeTab === TABS.NEW_INSPECTION) {
        if (!activeInspectionForm) return <div className="w-full max-w-7xl mx-auto p-4 md:p-8"><InspectionHub onSelectInspectionType={handleSelectInspectionType} /></div>;
        let FormComponent;
        switch (activeInspectionForm) {
            case 'hoja-trabajo': FormComponent = HojaTrabajoFormLazy; break;
            case 'informe-tecnico': FormComponent = InformeTecnicoFormLazy; break;
            case 'informe-revision': FormComponent = InformeRevisionFormLazy; break;
            case 'informe-simplificado': FormComponent = InformeSimplificadoFormLazy; break;
            case 'revision-basica': FormComponent = RevisionBasicaFormLazy; break;
            default: FormComponent = InformeTecnicoFormLazy;
        }
        return (
          <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>}>
            <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
              <FormComponent initialData={selectedTask} aiData={aiData} />
            </div>
          </Suspense>
        );
    }

    let TabComp: any;
    let props: any = {};
    switch (activeTab) {
        case TABS.TASKS: TabComp = TasksTabLazy; props = { onStartInspection: handleStartInspectionFromTask }; break;
        case TABS.EXPENSES: TabComp = RegistroJornadaForm; break;
        case TABS.PROFILE: TabComp = ProfileTabLazy; break;
        default: return <p>Pestaña no encontrada</p>;
    }
    return (
      <Suspense fallback={<div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>}>
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
          <TabComp {...props} />
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
      <main className="flex-grow w-full pt-0">
         {renderContent()}
      </main>
      {renderFloatingDictationButton()}
      <Footer activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}

export default function InspectionPage() {
    return <InspectionPageContent />;
}
