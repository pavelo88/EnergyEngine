
'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { Loader2, Mic, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadString, uploadBytes } from 'firebase/storage';
import { db as dbLocal } from '@/lib/db-local';
import { getBackoffDelay, isRetryableError, base64ToBlob } from '@/lib/offline-utils';

import Header from './components/Header';
import Footer from './components/Footer';

import MainMenuDesktop from './components/MainMenuDesktop';
import MainMenuMobile from './components/MainMenuMobile';
import InspectionHub from './components/InspectionHub';
import PinGate from './components/security/PinGate';

import TABS from './constants';
import { useScreenSize } from '@/hooks/use-screen-size';
import { processDictation, ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSearchParams } from 'next/navigation';

import {
  TasksTabLazy,
  RegistroGastoForm,
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
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [offlineEmail, setOfflineEmail] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [requiresStandalonePin, setRequiresStandalonePin] = useState(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isSettingUpPinForInstall, setIsSettingUpPinForInstall] = useState(false);

  const [isDictating, setIsDictating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<ProcessDictationOutput | null>(null);
  const [dictationNotebook, setDictationNotebook] = useState<string>('');
  const [configStatus, setConfigStatus] = useState({ hasSignature: false, hasPin: false });
  const recognitionRef = useRef<any>(null);
  const dictationBufferRef = useRef<string>('');

  useEffect(() => {
    setHasMounted(true);

    // Detectar si está corriendo como PWA instalada
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
    
    // Cargar email guardado offline (para PinGate sin sesión Firebase)
    dbLocal.table('seguridad').toArray().then(rows => {
      if (rows.length > 0) setOfflineEmail(rows[0].email);
    }).catch(() => {});

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

      // Chequeo de configuración para PWA
      const checkConfig = async () => {
        const signature = !!localStorage.getItem('energy_engine_signature');
        let pin = false;
        if (user?.email) {
          const security = await dbLocal.table('seguridad').get(user.email);
          pin = !!security?.pinHash;
        }
        setConfigStatus({ hasSignature: signature, hasPin: pin });
      };
      const checkStandalonePin = async () => {
        if (user?.email) {
          const security = await dbLocal.table('seguridad').get(user.email);
          if (!security || !security.pinHash) {
            setRequiresStandalonePin(true);
          }
        }
      };

      checkConfig();
      checkStandalonePin();
      return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    }
  }, [user, isOnline]);

  // Sincronización de Clientes (Background Sync)
  useEffect(() => {
    if (!isOnline || !firestore || !user) return;

    console.log("Iniciando sincronización de clientes...");
    const q = query(collection(firestore, 'clientes'), where('status', 'in', ['approved', 'preaprobado']));
    
    // Usamos onSnapshot para mantener la caché siempre al día mientras esté online
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const clientList = snapshot.docs.map((doc: any) => ({ 
        id: doc.id, 
        nombre: doc.data().nombre,
        direccion: doc.data().direccion
      }));
      
      dbLocal.clientes_cache.clear().then(() => {
        dbLocal.clientes_cache.bulkPut(clientList);
        console.log(`Caché de clientes actualizada: ${clientList.length} registros.`);
      });
    }, (error: any) => {
      console.error("Error en sincronización de clientes:", error);
    });

    return () => unsubscribe();
  }, [isOnline, firestore, user]);

  // Sincronización del Perfil de Usuario (Nombre del Técnico)
  useEffect(() => {
    if (!isOnline || !firestore || !user?.email) return;

    const syncProfile = async () => {
      try {
        const userDocSnap = await getDoc(doc(firestore, 'usuarios', user.email!));
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Guardamos el nombre en la tabla de seguridad para uso offline
          await dbLocal.table('seguridad').update(user.email!, { 
            nombre: userData.nombre 
          });
          console.log("Perfil de usuario sincronizado localmente.");
        }
      } catch (err) {
        console.error("Error al sincronizar perfil:", err);
      }
    };

    syncProfile();
  }, [isOnline, firestore, user]);

  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing || !user || !firestore) {
      console.log('🔴 syncOfflineData skipped:', { isOnline, isSyncing, user: !!user, firestore: !!firestore });
      return;
    }

    console.log('🟢 syncOfflineData INICIADA');
    setIsSyncing(true);
    const storage = getStorage(firestore.app);
    const maxRetries = 3;

    try {
      // 0. Sincronizar Clientes creados offline
      const pendingClientes = await dbLocal.clientes_pendientes.filter(record => !record.synced).toArray();
      console.log(`📦 Clientes pendientes: ${pendingClientes.length}`);
      
      for (const record of pendingClientes) {
        let retryCount = 0;
        let synced = false;

        while (retryCount < maxRetries && !synced) {
          try {
            const docId = record.firebaseId || `CLIENT-${Date.now()}`;
            console.log(`  ↑ Cliente: ${docId}`);
            await setDoc(doc(firestore, 'clientes', docId), record.data);
            await dbLocal.clientes_cache.put({ id: docId, ...record.data });
            await dbLocal.clientes_pendientes.update(record.id!, { synced: true, firebaseId: docId });
            synced = true;
            console.log(`  ✅ Cliente OK: ${docId}`);
          } catch (itemError: any) {
            retryCount++;
            console.log(`  ⚠️ Cliente error (intento ${retryCount}): ${itemError?.message}`);
            if (isRetryableError(itemError) && retryCount < maxRetries) {
              const delay = getBackoffDelay(retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`  ❌ Cliente fallido: ${record.id}`);
              break;
            }
          }
        }
      }

      // 1. Sincronizar Hojas de Trabajo CON IMÁGENES
      const pendingHojas = await dbLocal.hojas_trabajo.filter(record => !record.synced).toArray();
      console.log(`📦 Hojas pendientes: ${pendingHojas.length}`);
      
      for (const record of pendingHojas) {
        let retryCount = 0;
        let synced = false;
        
        // record.firebaseId ahora es el sequentialId (HT-XX-0001)
        const formType = record.data?.formType || 'informe';
        const localSuffix = (record.id || Date.now()).toString().padStart(4, '0');
        const fallbackPrefix =
          formType === 'hoja-trabajo' ? 'HT-REC-' :
          formType === 'informe-tecnico' ? 'IT-REC-' :
          formType === 'informe-revision' ? 'IR-REC-' :
          formType === 'informe-simplificado' ? 'IS-REC-' :
          formType === 'revision-basica' ? 'BAS-REC-' :
          'INF-REC-';
        const docId = record.firebaseId || `${fallbackPrefix}${localSuffix}`;
        if (!record.firebaseId && record.id) {
          await dbLocal.hojas_trabajo.update(record.id, { firebaseId: docId });
        }
        console.log(`\n🔄 Procesando hoja: ${docId}`);
        console.log(`   secuentialId/claveFBID: ${docId}`);

        while (retryCount < maxRetries && !synced) {
          try {
            const { imageIds, displayId, ...formDataForFirebase } = record.data;
            const normalizedData: any = { ...formDataForFirebase };

            if (normalizedData.clienteId) {
              const cachedClient = await dbLocal.clientes_cache.get(normalizedData.clienteId);
              if (cachedClient) {
                normalizedData.clienteNombre = cachedClient.nombre || normalizedData.clienteNombre;
                normalizedData.cliente = cachedClient.nombre || normalizedData.cliente;
                normalizedData.instalacion = cachedClient.direccion || normalizedData.instalacion;
              }
            }
            console.log(`   📌 Clave documento=${docId}, displayId=${displayId}, imageIds=${imageIds?.length || 0}`);

            let inspectorSignatureUrl = normalizedData.inspectorSignatureUrl;
            if (normalizedData.inspectorSignature && normalizedData.inspectorSignature.startsWith('data:')) {
              const inspRef = ref(storage, `firmas/${docId}/inspector.png`);
              await uploadString(inspRef, normalizedData.inspectorSignature, 'data_url');
              inspectorSignatureUrl = await getDownloadURL(inspRef);
              console.log(`   ✅ Firma inspector subida`);
            }

            let clientSignatureUrl = normalizedData.clientSignatureUrl;
            if (normalizedData.clientSignature && normalizedData.clientSignature.startsWith('data:')) {
              const cliRef = ref(storage, `firmas/${docId}/cliente.png`);
              await uploadString(cliRef, normalizedData.clientSignature, 'data_url');
              clientSignatureUrl = await getDownloadURL(cliRef);
              console.log(`   ✅ Firma cliente subida`);
            }

            // Procesar y subir imágenes desde IndexedDB
            const imageUrls: string[] = [];
            if (imageIds && imageIds.length > 0) {
              console.log(`   📸 Procesando ${imageIds.length} imágenes...`);
              for (const imgId of imageIds) {
                const imgRecord = await dbLocal.imagenes.get(imgId);
                if (imgRecord && imgRecord.base64Data) {
                  try {
                    const blob = base64ToBlob(imgRecord.base64Data, imgRecord.mimeType);
                    const imgRef = ref(storage, `informes/${docId}/${Date.now()}_${imgRecord.fileName}`);
                    await uploadBytes(imgRef, blob);
                    const url = await getDownloadURL(imgRef);
                    imageUrls.push(url);
                    await dbLocal.imagenes.update(imgId, { synced: true, uploadedUrl: url });
                    console.log(`     ✅ Imagen ${imgRecord.fileName}`);
                  } catch (imgErr: any) {
                    console.error(`     ❌ Error imagen: ${imgErr?.message}`);
                  }
                }
              }
            }

            if ((!imageIds || imageIds.length === 0) && Array.isArray(record.data?.images) && record.data.images.length > 0) {
              for (const image of record.data.images) {
                if (!image) continue;
                try {
                  const fileName = (image as any).name || `offline_${Date.now()}.jpg`;
                  const imgRef = ref(storage, `informes/${docId}/${Date.now()}_${fileName}`);
                  await uploadBytes(imgRef, image as Blob);
                  const url = await getDownloadURL(imgRef);
                  imageUrls.push(url);
                } catch (imgErr: any) {
                  console.error(`Error imagen legacy: ${imgErr?.message}`);
                }
              }
            }

            const docData = { 
              ...normalizedData, 
              imageUrls, 
              inspectorSignatureUrl, 
              clientSignatureUrl, 
              numero_informe: displayId || docId,  // Usar displayId si existe, sino usar docId
              fecha_creacion: Timestamp.now() 
            };
            
            console.log(`   💾 Guardando en Firestore con docId=${docId}, numero_informe=${displayId || docId}: clienteId=${docData.clienteId}, clienteNombre=${docData.clienteNombre}`);
            await setDoc(doc(firestore, 'informes', docId), docData);
            console.log(`   ✅ Guardado en Firestore OK`);

            if (record.data.originalJobId) {
              await updateDoc(doc(firestore, 'ordenes_trabajo', record.data.originalJobId), { estado: 'Completado' });
            }

            await dbLocal.hojas_trabajo.update(record.id!, { synced: true, firebaseId: docId });
            synced = true;
            console.log(`✅ Hoja de Trabajo sincronizada: ${docId}`);
          } catch (itemError: any) {
            retryCount++;
            console.error(`⚠️ Error hoja (intento ${retryCount}): ${itemError?.message}\n${itemError?.stack}`);
            if (isRetryableError(itemError) && retryCount < maxRetries) {
              const delay = getBackoffDelay(retryCount);
              console.log(`   ⏳ Reintentando en ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`❌ Hoja fallida: ${record.id}`);
              break;
            }
          }
        }
      }

      // 2. Sincronizar Reportes de Gastos CON COMPROBANTES
      const pendingGastos = await dbLocal.gastos_report.filter(r => !r.synced).toArray();
      console.log(`📦 Gastos pendientes: ${pendingGastos.length}`);
      
      for (const record of pendingGastos) {
        let retryCount = 0;
        let synced = false;
        
        console.log(`\n💰 Procesando gasto: ${record.firebaseId}`);

        while (retryCount < maxRetries && !synced) {
          try {
            const reportId = record.firebaseId || `GR-REC-${(record.id || Date.now()).toString().padStart(4, '0')}`;
            if (!record.firebaseId && record.id) {
              await dbLocal.gastos_report.update(record.id, { firebaseId: reportId });
            }
            const { signature, stops, gastos, ...restData } = record.data;

            let firmaUrl = '';
            if (signature && signature.startsWith('data:')) {
              const sigRef = ref(storage, `firmas_gastos/${reportId}.png`);
              await uploadString(sigRef, signature, 'data_url');
              firmaUrl = await getDownloadURL(sigRef);
              console.log(`   ✅ Firma gasto subida`);
            }

            const formattedGastos = [];
            for (const g of gastos) {
              let cUrl = g.comprobanteUrl || '';

              if (g.comprobanteBase64 && g.comprobanteFileName) {
                try {
                  const blob = base64ToBlob(g.comprobanteBase64, g.comprobanteMimeType);
                  const fRef = ref(storage, `comprobantes_gastos/${reportId}/${Date.now()}_${g.comprobanteFileName}`);
                  await uploadBytes(fRef, blob);
                  cUrl = await getDownloadURL(fRef);
                  console.log(`   ✅ Comprobante ${g.comprobanteFileName}`);
                } catch (fileErr: any) {
                  console.error(`   ❌ Error comprobante: ${fileErr?.message}`);
                }
              }

              const stopInfo = stops.find((s: any) => s.id === g.stopId);
              const { comprobanteBase64, comprobanteFileName, comprobanteMimeType, ...cleanGasto } = g;
              
              formattedGastos.push({
                ...cleanGasto,
                comprobanteUrl: cUrl,
                clienteNombre: stopInfo?.clienteNombre || 'Gasto General'
              });
            }

            console.log(`   💾 Guardando gasto en Firestore con docId=${reportId}...`);
            await setDoc(doc(firestore, 'hojas_gastos', reportId), {
              ...restData,
              id: reportId,  // clave principal
              itinerario: stops,
              gastos: formattedGastos,
              firmaUrl,
              fecha_creacion: Timestamp.now(),
            });

            await dbLocal.gastos_report.update(record.id!, { synced: true, firebaseId: reportId });
            synced = true;
            console.log(`✅ Gasto sincronizado: ${restData.id}`);
          } catch (gastoError: any) {
            retryCount++;
            console.error(`⚠️ Error gasto (intento ${retryCount}): ${gastoError?.message}`);
            if (isRetryableError(gastoError) && retryCount < maxRetries) {
              const delay = getBackoffDelay(retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`❌ Gasto fallido`);
              break;
            }
          }
        }
      }

      console.log(`\n🎉 Sincronización completada`);
      toast({ title: 'Sincronización completada ✓', description: 'Todos los datos offline han sido subidos.' });
    } catch (error: any) {
      console.error('❌ Error general:', error?.message, error?.stack);
      toast({ variant: 'destructive', title: 'Error en sincronización', description: 'Se reintentará al reconectar.' });
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, user, firestore, toast]);

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

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Validar si requiere setup de PIN antes de instalar
    if (user?.email) {
      const security = await dbLocal.table('seguridad').get(user.email);
      if (!security || !security.pinHash) {
        setIsSettingUpPinForInstall(true);
        return;
      }
    }

    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };

  const isDictatingRef = useRef(false);

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
      if (isDictatingRef.current) {
        setTimeout(() => {
          if (isDictatingRef.current) {
            try { recognition.start(); } catch (err) { }
          }
        }, 100);
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'aborted' || e.error === 'not-allowed') return;
      if (isDictatingRef.current) {
        setTimeout(() => {
          if (isDictatingRef.current) {
            try { recognition.start(); } catch (err) { }
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Start failed:", e);
    }
  };

  const processFinalDictation = async () => {
    const text = dictationBufferRef.current.trim();
    if (!text) return;

    setAiLoading(true);
    try {
      const res = await processDictation({ dictation: text });
      setAiData(res);
      toast({ title: "Voz Procesada ✓", description: "Formulario completado." });
    } catch (e) {
      setAiData({ observations_summary: text } as any);
      toast({ variant: "destructive", title: "Error IA", description: "Texto volcado manual." });
    } finally {
      setAiLoading(false);
    }
  };


  const toggleDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Error", description: "No soportado." });
      return;
    }

    if (isDictating) {
      isDictatingRef.current = false;
      setIsDictating(false);
      recognitionRef.current?.stop();
      setTimeout(() => {
        processFinalDictation();
      }, 400);
    } else {
      dictationBufferRef.current = '';
      isDictatingRef.current = true;
      setIsDictating(true);
      startRecognition();
      toast({ title: "Escuchando...", description: "Hable ahora." });
    }
  };

  const handleAiAnalyze = async () => {
    if (!dictationNotebook.trim()) { toast({ variant: "destructive", title: "Vacío", description: "Dicta algo primero." }); return; }
    setAiLoading(true);
    try {
      const res = await processDictation({ dictation: dictationNotebook });
      setAiData(res);
      toast({ title: "Procesado ✓", description: "Formulario completado." });
    } catch (e) {
      setAiData({ observations_summary: dictationNotebook } as any);
      toast({ variant: "destructive", title: "Error IA", description: "Texto volcado manual." });
    } finally { setAiLoading(false); }
  };

  if (isUserLoading) return <div className="flex h-screen items-center justify-center bg-slate-100"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const renderContent = () => {
    if (!hasMounted) return <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    // SETUP DE PIN FORZADO ANTES DE INSTALAR o PWA INSTALADA
    if ((isSettingUpPinForInstall || (isStandalone && requiresStandalonePin)) && user?.email) {
      return (
        <PinGate 
          userEmail={user.email} 
          onVerified={() => {
             setIsSettingUpPinForInstall(false);
             setRequiresStandalonePin(false);
             if (installPrompt && isSettingUpPinForInstall) {
               installPrompt.prompt();
               installPrompt.userChoice.then(() => setInstallPrompt(null));
             }
          }} 
        />
      );
    }

    // BLOQUEO POR PIN (offline — usa email de Firebase o de sesión guardada)
    const emailForPin = user?.email || offlineEmail;
    if (!isOnline && !isPinVerified && emailForPin) {
      return <PinGate userEmail={emailForPin} onVerified={() => setIsPinVerified(true)} />;
    }
    // Offline sin email guardado: redirigir a auth
    if (!isOnline && !isPinVerified && !emailForPin) {
      if (typeof window !== 'undefined') window.location.href = '/auth/inspection';
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (activeTab === TABS.MENU) {
      const name = user?.displayName || user?.email?.split('@')[0] || 'Técnico';
      const menuProps = {
        onNavigate: handleNavigate,
        onSelectInspection: handleSelectInspectionType,
        userName: name,
        onInstall: handleInstallClick,
        onConfigure: () => handleNavigate(TABS.PROFILE),
        canInstall: !!installPrompt,
        configStatus,
        isOnline
      };

      return (
        <div className="w-full max-w-4xl mx-auto px-4">
          {(screenSize === 'desktop' || screenSize === 'tablet') ? (
            <MainMenuDesktop {...menuProps} />
          ) : (
            <MainMenuMobile {...menuProps} />
          )}
        </div>
      );
    }

    let Component;
    let props: any = {};

    if (activeTab === TABS.NEW_INSPECTION) {
      if (!activeInspectionForm) return <div className="w-full h-full max-w-4xl mx-auto"><InspectionHub onSelectInspectionType={handleSelectInspectionType} onInstall={handleInstallClick} canInstall={!!installPrompt} /></div>;

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
        case TABS.EXPENSES: Component = RegistroGastoForm; break;
        case TABS.PROFILE: Component = ProfileTabLazy; break;
        default: return <p className="text-center py-20 text-slate-400">Componente no encontrado</p>;
      }
    }

    return (
      <Suspense fallback={<div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400 font-bold"><Loader2 className="animate-spin text-primary" size={40} /> CARGANDO...</div>}>
        <div className="w-full h-full max-w-4xl mx-auto">
          {activeInspectionForm && dictationNotebook && (
            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center shadow-sm">
              <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">CUADERNO DE NOTAS</p>
                <p className="text-xs text-indigo-800 line-clamp-1 italic text-ellipsis">"{dictationNotebook.substring(0, 100)}..."</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDictationNotebook('')} className="px-3 py-1.5 bg-white text-indigo-400 rounded-lg text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Borrar</button>
                <button onClick={handleAiAnalyze} disabled={aiLoading} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase shadow-md flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                  {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <span>Analizar con IA</span>}
                </button>
              </div>
            </div>
          )}
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

      {isSyncing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/20 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-2xl px-5 py-4 shadow-xl border border-slate-100 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">Sincronizando informes...</span>
          </div>
        </div>
      )}

      {activeInspectionForm && (
        <button
          onClick={toggleDictation}
          className={`fixed bottom-24 right-6 w-16 h-16 rounded-full text-white shadow-2xl flex items-center justify-center z-50 transition-all transform active:scale-90 hover:scale-105
              ${isDictating ? 'bg-red-600 animate-pulse' : 'bg-primary'} ${aiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={aiLoading}
        >
          {aiLoading ? <Loader2 className="animate-spin" size={28} /> : isDictating ? <Square size={24} /> : <Mic size={28} />}
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
