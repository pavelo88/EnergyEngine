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
import MainMenuTablet from './components/MainMenuTablet';
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
            title: "Conexión recuperada. Sincronizando...",
            description: `${totalPending} registros pendientes por subir.`,
          });

          let syncedCount = 0;

          for (const record of pendingHojas) {
            try {
              const dataToSync = record.data;
              const { images, inspectorSignature, clientSignature, originalJobId, ...formDataForFirebase } = dataToSync;
              const formType = formDataForFirebase.formType;

              const trabajosRef = collection(firestore, 'trabajos');
              const qTrabajos = query(trabajosRef, where('formType', '==', formType));
              const trabajosSnapshot = await getDocs(qTrabajos);
              const sequentialNumber = (trabajosSnapshot.size + syncedCount + 1).toString().padStart(3, '0');
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
                } catch (updateError) {
                    console.error(`Sync engine failed to update job ${originalJobId}:`, updateError);
                }
              }
              
              await dbLocal.hojas_trabajo.update(record.id!, { synced: true, firebaseId: docId });
              syncedCount++;
            } catch (error) {
              console.error('Failed to sync report:', record.id, error);
            }
          }

          for (const record of pendingJornadas) {
             try {
                const { signature, ...jornadaData } = record.data;
                const jornadaId = `J-${Date.now().toString().slice(-6)}-${user.uid.slice(0,4)}`;
                
                let firmaUrl = null;
                if (signature) {
                    const sigRef = ref(storage, `firmas_jornadas/${jornadaId}.png`);
                    await uploadString(sigRef, signature, 'data_url');
                    firmaUrl = await getDownloadURL(sigRef);
                }
                
                const jornadaDocRef = doc(collection(firestore, "jornadas"), jornadaId);
                await setDoc(jornadaDocRef, { ...jornadaData, firmaUrl, id: jornadaDocRef.id, fecha_creacion: serverTimestamp() });
                
                await dbLocal.registros_jornada.update(record.id!, { synced: true, firebaseId: jornadaId });

             } catch(error) {
                console.error("Failed to sync jornada record:", record.id, error);
             }
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

             } catch(error) {
                 console.error("Failed to sync gasto record:", record.id, error);
             }
           }

          if(totalPending > 0) {
            toast({
              title: "¡Sincronización completa!",
              description: `${totalPending} registros se han guardado en la nube.`,
            });
          }
        }
        setIsSyncing(false);
      }
    };
    syncOfflineData();
  }, [isOnline, isSyncing, user, firestore, toast]);

  useEffect(() => {
    setHasMounted(true);
    
    const handleInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
    };

    if (typeof window !== "undefined") {
      window.addEventListener('beforeinstallprompt', handleInstallPrompt);

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .catch((err) => console.log('Service Worker registration failed:', err));
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'es-ES';
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            let chunk = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    chunk += event.results[i][0].transcript + ' ';
                }
            }
            if (chunk) {
                dictationBufferRef.current += chunk;
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                toast({
                    variant: "destructive",
                    title: "Error de Micrófono",
                    description: "No se pudo usar el dictado. Revisa los permisos.",
                });
                setIsDictating(false);
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
                    
                    if (res.error) {
                      toast({
                        variant: "destructive",
                        title: "Aviso de IA",
                        description: "El servicio de IA no está disponible ahora, pero el texto ha sido registrado.",
                      });
                    } else {
                      toast({
                        title: "IA ha procesado el dictado",
                        description: "Los campos del formulario han sido actualizados.",
                      });
                    }
                } catch (e) {
                    console.error("AI dictation processing failed:", e);
                    toast({
                      variant: "destructive",
                      title: "Error de la IA",
                      description: "La IA no pudo procesar el dictado. Inténtalo de nuevo.",
                    });
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
    installPrompt.userChoice.then(() => {
        setInstallPrompt(null);
    });
  };

  const toggleDictation = () => {
      if (!isOnline) {
          toast({ variant: "destructive", title: "Sin Conexión", description: "El dictado por IA requiere conexión a internet." });
          return;
      }
      if (!recognitionRef.current) {
          toast({ variant: "destructive", title: "Navegador no compatible", description: "El dictado por voz no funciona en este navegador." });
          return;
      }
      if (isDictating) {
          recognitionRef.current.stop();
          toast({ title: "Procesando dictado...", description: "La IA está estructurando la información." });
      } else {
          dictationBufferRef.current = '';
          setAiData(null);
          recognitionRef.current.start();
          setIsDictating(true);
          toast({ title: "Micrófono abierto", description: "Puedes hablar con normalidad." });
      }
  };

  const renderFloatingDictationButton = () => {
      const supportedForms: FormType[] = ['hoja-trabajo', 'informe-tecnico', 'informe-revision', 'informe-simplificado', 'revision-basica'];
      if (!activeInspectionForm || !supportedForms.includes(activeInspectionForm)) {
          return null;
      }

      const bottomPosition = screenSize === 'mobile' ? 'bottom-28' : 'bottom-8';

      return (
          <button
              onClick={toggleDictation}
              className={`fixed ${bottomPosition} right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all duration-300 transform active:scale-90
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-primary'}
              ${aiLoading ? 'bg-gray-400 cursor-not-allowed' : ''}`}
              disabled={aiLoading}
              aria-label={isDictating ? 'Detener dictado' : 'Iniciar dictado'}
          >
              {aiLoading ? <Loader2 className="animate-spin" size={28}/> : isDictating ? <Square size={24}/> : <Mic size={28}/>}
          </button>
      );
  };

  if (isUserLoading) {
     return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>;

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
          return <MainMenuMobile onNavigate={handleNavigate} userName={userName} />;
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
            case 'revision-basica': FormComponent = RevisionBasicaFormLazy; break;
            default: FormComponent = InformeTecnicoFormLazy;
        }

        return (
            <Suspense fallback={<div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
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
      <Suspense fallback={<div className="flex-grow flex items-center justify-center p-20"><Loader2 className="animate-spin" /></div>}>
        <TabComponent {...props} />
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
      <main className="flex-grow w-full">
        <div className="w-full max-w-none">
         {renderContent()}
        </div>
      </main>
      {renderFloatingDictationButton()}
      <Footer activeTab={activeTab} onNavigate={handleNavigate} />
    </div>
  );
}

export default function InspectionPage() {
    return <InspectionPageContent />;
}
