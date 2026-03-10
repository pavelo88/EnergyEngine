'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Car, Euro, Zap, Thermometer, Battery, Droplets, Wind, Gauge, Mic, Camera } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';

// Memoized input component for performance
const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16}/>}
      <input 
        type={type}
        value={value || ''}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-3 ${Icon ? 'pl-11' : ''} outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm`}
      />
    </div>
  </div>
));

// New component for the load test inputs
const LoadTestInput = React.memo(({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[9px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e: any) => onChange(e.target.value)}
            className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm text-center"
        />
    </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
  const doc = new jsPDF();
  const finalID = reportId || 'BORRADOR';
  const darkColor = '#0f172a'; // Slate-900
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Márgenes
  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 40;
  const bottomMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = topMargin;

  // 1. Sub-header (Título y Nº)
  doc.setTextColor(darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("HOJA DE TRABAJO", leftMargin, currentY);

  doc.setFontSize(10);
  doc.text(`Nº: ${finalID}`, pageWidth - rightMargin, currentY, { align: 'right' });
  currentY += 6;

  // 2. Tabla de Cliente y Servicio
  autoTable(doc, {
      startY: currentY,
      body: [
          [{content: 'CLIENTE:', styles: {fontStyle: 'bold'}}, report.cliente, {content: 'FECHA:', styles: {fontStyle: 'bold'}}, report.fecha],
          [{content: 'INSTALACIÓN:', styles: {fontStyle: 'bold'}}, report.instalacion, {content: 'TÉCNICOS:', styles: {fontStyle: 'bold'}}, report.tecnicos],
          [{content: 'UBICACIÓN (LAT/LON):', styles: {fontStyle: 'bold'}}, {content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3}],
          [{content: 'MOTOR:', styles: {fontStyle: 'bold'}}, report.motor, {content: 'H. ASISTENCIA:', styles: {fontStyle: 'bold'}}, report.h_asistencia],
          [{content: 'Nº MOTOR:', styles: {fontStyle: 'bold'}}, report.n_motor, {content: 'TIPO DE SERVICIO:', styles: {fontStyle: 'bold'}}, report.tipo_servicio],
          [{content: 'GRUPO:', styles: {fontStyle: 'bold'}}, report.grupo, {content: 'KMS.:', styles: {fontStyle: 'bold'}}, report.kms],
          [{content: 'Nº GRUPO:', styles: {fontStyle: 'bold'}}, report.n_grupo, {content: 'DIETA:', styles: {fontStyle: 'bold'}}, `${report.dieta} € ${report.media_dieta ? `(1/2 Cant: ${report.media_dieta_cantidad})`:''}`],
          [{content: 'Nº DE PEDIDO:', styles: {fontStyle: 'bold'}}, report.n_pedido, '', ''],
      ],
      theme: 'grid',
      styles: {fontSize: 8, cellPadding: 2},
      margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. TRABAJOS REALIZADOS
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("TRABAJOS REALIZADOS", leftMargin, currentY);
  currentY += 4;

  const rawText = report.trabajos_realizados || '';
  const blocks = rawText.split('\n\n'); 

  blocks.forEach((block: string) => {
      const text = block.replace(/\n/g, ' ').trim(); 
      if (!text) return;

      const isTitle = text.endsWith(':') && text.toUpperCase() === text;

      if (isTitle) {
          if (currentY + 15 > pageHeight - bottomMargin) {
              doc.addPage();
              currentY = topMargin;
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(darkColor);
          doc.text(text, leftMargin, currentY);
          currentY += 6;
      } else {
          autoTable(doc, {
              startY: currentY,
              margin: { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin },
              body: [[text]],
              theme: 'plain',
              styles: { font: 'helvetica', fontSize: 9, cellPadding: 0, halign: 'justify', textColor: darkColor },
              columnStyles: { 0: { cellWidth: contentWidth } }
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
      }
  });

  currentY += 6;

  // 4. PARÁMETROS TÉCNICOS
  if (currentY + 40 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("PARÁMETROS TÉCNICOS", leftMargin, currentY);
  currentY += 4;

  autoTable(doc, {
      startY: currentY,
      body: [
          [`Horas: ${report.parametrosTecnicos.horas}`, `Presión Aceite: ${report.parametrosTecnicos.presionAceite}`, `Tensión: ${report.parametrosTecnicos.tension}`],
          [`Tª (°C): ${report.parametrosTecnicos.temperatura}`, `Nivel Combustible (%): ${report.parametrosTecnicos.nivelCombustible}`, `Frecuencia (Hz): ${report.parametrosTecnicos.frecuencia}`],
          [{content: `Tensión de baterías (V): ${report.parametrosTecnicos.tensionBaterias}`, colSpan: 3}],
      ],
      theme: 'grid',
      styles: {fontSize: 8, cellPadding: 1.5, minCellHeight: 8},
      bodyStyles: {fontStyle: 'bold'},
      margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. POTENCIA CON CARGA
  if (currentY + 45 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Potencia con carga: ${report.potenciaConCarga.potencia}`, leftMargin, currentY);
  currentY += 3;

  autoTable(doc, {
      startY: currentY,
      head: [['Tensión', 'Intensidad', 'Potencia (kW)']],
      body: [
          [`RS: ${report.potenciaConCarga.tensionRS}`, `R: ${report.potenciaConCarga.intensidadR}`, {rowSpan: 3, content: report.potenciaConCarga.potenciaKW, styles: {valign: 'middle', halign: 'center'}}],
          [`ST: ${report.potenciaConCarga.tensionST}`, `S: ${report.potenciaConCarga.intensidadS}`],
          [`RT: ${report.potenciaConCarga.tensionRT}`, `T: ${report.potenciaConCarga.intensidadT}`],
      ],
      theme: 'grid',
      styles: {fontSize: 9, cellPadding: 1.5, minCellHeight: 8},
      headStyles: { fillColor: darkColor, textColor: '#fff' },
      bodyStyles: {fontStyle: 'bold'},
      margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 6. FIRMAS
  const signatureBlockHeight = 45;
  if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Firma Técnico (Izquierda)
  if (report.inspectorSignatureUrl) {
      doc.addImage(report.inspectorSignatureUrl, 'PNG', 25, currentY, 60, 25);
  }
  doc.line(25, currentY + 25, 85, currentY + 25);
  doc.text("Firma técnico:", 25, currentY + 30);
  doc.text(inspectorName || '', 25, currentY + 35);

  // Firma Cliente (Derecha)
  if (report.clientSignatureUrl) {
      doc.addImage(report.clientSignatureUrl, 'PNG', 125, currentY, 60, 25);
  }
  doc.line(125, currentY + 25, 185, currentY + 25);
  doc.text("Conforme cliente:", 125, currentY + 30);
  doc.text(report.recibidoPor || '', 125, currentY + 35);
  
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, totalPages);
  }

  return doc;
};


export default function HojaTrabajoForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    formType: 'hoja-trabajo',
    cliente: '',
    instalacion: '',
    motor: '',
    n_motor: '',
    grupo: '',
    n_grupo: '',
    n_pedido: '',
    location: null as { lat: number, lon: number } | null,
    fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    tecnicos: '',
    h_asistencia: '',
    tipo_servicio: 'MANTENIMIENTO CORRECTIVO',
    kms: '',
    dieta: '',
    media_dieta: false,
    media_dieta_cantidad: '',
    trabajos_realizados: '',
    recibidoPor: '',
    parametrosTecnicos: {
        horas: '',
        presionAceite: '',
        tension: '',
        temperatura: '',
        nivelCombustible: '',
        frecuencia: '',
        tensionBaterias: '',
    },
    potenciaConCarga: {
        potencia: '',
        tensionRS: '',
        tensionST: '',
        tensionRT: '',
        intensidadR: '',
        intensidadS: '',
        intensidadT: '',
        potenciaKW: '',
    }
  });
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchUserName = async () => {
        if (user && user.email && db) {
            try {
                const userDocRef = doc(db, 'usuarios', user.email);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userName = userDocSnap.data().nombre;
                    setInspectorName(userName);
                    setFormData((prev: any) => ({...prev, tecnicos: userName}));
                } else {
                     setInspectorName(user.displayName || user.email || 'Técnico');
                     setFormData((prev: any) => ({...prev, tecnicos: user.displayName || user.email || 'Técnico' }));
                }
            } catch(e: any) {
                console.error("Error fetching user name:", e);
                setInspectorName(user.displayName || user.email || 'Técnico');
                setFormData((prev: any) => ({...prev, tecnicos: user.displayName || user.email || 'Técnico' }));
            }
        }
    };
    fetchUserName();
  }, [user, db]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
        ...prev,
        cliente: initialData.clienteNombre || prev.cliente,
        instalacion: initialData.instalacion || prev.instalacion,
        motor: initialData.modelo || prev.motor,
        n_motor: initialData.n_motor || prev.n_motor,
        trabajos_realizados: initialData.descripcion || prev.trabajos_realizados,
      }));
    }
  }, [initialData]);

  // Effect to process incoming AI data
  useEffect(() => {
    if (aiData) {
      setFormData((prev: any) => ({
        ...prev,
        cliente: aiData.identidad.cliente || prev.cliente,
        instalacion: aiData.identidad.instalacion || prev.instalacion,
        motor: aiData.identidad.modelo || prev.motor,
        n_motor: aiData.identidad.sn || prev.n_motor,
        grupo: aiData.identidad.n_grupo || prev.grupo,
        recibidoPor: aiData.identidad.recibe || prev.recibidoPor,
        trabajos_realizados: aiData.observations_summary || prev.trabajos_realizados,
        parametrosTecnicos: {
          horas: aiData.mediciones_generales.horas || prev.parametrosTecnicos.horas,
          presionAceite: aiData.mediciones_generales.presion || prev.parametrosTecnicos.presionAceite,
          tension: aiData.mediciones_generales.tensionAlt || prev.parametrosTecnicos.tension,
          temperatura: aiData.mediciones_generales.temp || prev.parametrosTecnicos.temperatura,
          nivelCombustible: aiData.mediciones_generales.combustible || prev.parametrosTecnicos.nivelCombustible,
          frecuencia: aiData.mediciones_generales.frecuencia || prev.parametrosTecnicos.frecuencia,
          tensionBaterias: aiData.mediciones_generales.cargaBat || prev.parametrosTecnicos.tensionBaterias,
        },
        potenciaConCarga: {
          ...prev.potenciaConCarga,
          tensionRS: aiData.pruebas_carga.rs || prev.potenciaConCarga.tensionRS,
          tensionST: aiData.pruebas_carga.st || prev.potenciaConCarga.tensionST,
          tensionRT: aiData.pruebas_carga.rt || prev.potenciaConCarga.tensionRT,
          intensidadR: aiData.pruebas_carga.r || prev.potenciaConCarga.intensidadR,
          intensidadS: aiData.pruebas_carga.s || prev.potenciaConCarga.intensidadS,
          intensidadT: aiData.pruebas_carga.t || prev.potenciaConCarga.intensidadT,
          potenciaKW: aiData.pruebas_carga.kw || prev.potenciaConCarga.potenciaKW,
        }
      }));
    }
  }, [aiData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({...prev, [field]: value }));
  };
  
  const handleNestedInputChange = (section: 'parametrosTecnicos' | 'potenciaConCarga', field: string, value: string) => {
    setFormData((prev: any) => ({
        ...prev,
        [section]: {
            ...(prev[section] as any),
            [field]: value
        }
    }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error de Geolocalización', description: 'Tu navegador no soporta esta función.' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
      },
      () => {
        toast({ variant: 'destructive', title: 'Ubicación denegada', description: 'Asegúrate de tener los permisos de localización activados.' });
        setLocationStatus('error');
      }
    );
  };

  const improveReport = async () => {
    if (!formData.trabajos_realizados) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData.trabajos_realizados });
      setFormData((p: any) => ({
        ...p, 
        trabajos_realizados: res.improved,
      }));
       toast({ title: 'Informe mejorado', description: 'La IA ha refinado y mejorado el texto del informe.' });
    } catch(e: any) {
      console.error("AI enhancement failed:", e);
      toast({ variant: 'destructive', title: 'Error de la IA', description: 'No se pudo procesar la mejora del informe.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePdfAction = () => {
    if (!formData.cliente || !formData.instalacion) {
        toast({ variant: 'destructive', title: 'Faltan datos', description: 'El cliente y la instalación son obligatorios para generar el PDF.' });
        return;
    }
    
    const reportData = {
      ...formData,
      inspectorSignatureUrl: inspectorSignature,
      clientSignatureUrl: clientSignature,
    };
    
    const doc = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');

    if (isSaved) {
      doc.save(`Hoja_Trabajo_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSave = async () => {
    if (!user || !db) {
        toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Por favor, recarga la página.' });
        return;
    }
    if (!formData.cliente || !formData.instalacion || !formData.location || !inspectorSignature || !clientSignature) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Cliente, instalación, localización y ambas firmas son obligatorios.' });
      return;
    }
    setSaving(true);

    const updateOriginalJobStatus = async (jobId: string) => {
      if (isOnline && db) {
          try {
              const jobRef = doc(db, 'trabajos', jobId);
              await updateDoc(jobRef, { estado: 'Completado' });
          } catch (updateError) {
              console.error(`Failed to update job ${jobId} status:`, updateError);
              toast({
                  variant: "destructive",
                  title: "Error de Actualización",
                  description: `No se pudo marcar el trabajo ${jobId} como completado.`,
              });
          }
      }
    };

    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
        const localData = { 
          ...formData, 
          formType: 'hoja-trabajo',
          originalJobId: initialData?.id || null
        };
        
        if (!synced) {
            (localData as any).images = images;
            (localData as any).inspectorSignature = inspectorSignature;
            (localData as any).clientSignature = clientSignature;
        }

        await db.hojas_trabajo.add({
            firebaseId: firebaseId || '',
            synced,
            data: localData,
            createdAt: new Date(),
        });

        if (!synced) {
            toast({ title: 'Guardado localmente (sin conexión)', description: 'El informe se sincronizará cuando vuelvas a tener conexión.' });
        } else {
            toast({ title: '¡Guardado y Sincronizado!', description: `La hoja de trabajo ha sido guardada con el ID: ${firebaseId}` });
        }
    };

    if (isOnline) {
        try {
            const formType = 'hoja-trabajo';
            const trabajosRef = collection(db, 'trabajos');
            const qTrabajos = query(trabajosRef, where('formType', '==', formType));
            const trabajosSnapshot = await getDocs(qTrabajos);
            const sequentialNumber = (trabajosSnapshot.size + 1).toString().padStart(3, '0');
            const year = new Date().getFullYear();
            const docId = `HT-${year}-${sequentialNumber}`;

            const storage = getStorage();
            const imageUrls = await Promise.all(images.map(async (image) => {
                const imageRef = ref(storage, `informes/${docId}/${image.name}`);
                await uploadBytes(imageRef, image);
                return await getDownloadURL(imageRef);
            }));

            const inspectorSignatureUrl = inspectorSignature ? await getDownloadURL(await uploadString(ref(storage, `firmas/${docId}/inspector.png`), inspectorSignature, 'data_url')) : null;
            const clientSignatureUrl = clientSignature ? await getDownloadURL(await uploadString(ref(storage, `firmas/${docId}/cliente.png`), clientSignature, 'data_url')) : null;
            
            const docData = {
                ...formData, imageUrls, inspectorSignatureUrl, clientSignatureUrl,
                tecnicoId: user.uid, tecnicoNombre: inspectorName,
                fecha_creacion: Timestamp.now(), id: docId, formType, estado: 'Completado',
            };
            
            await setDoc(doc(db, 'trabajos', docId), docData);

            if (initialData?.id) {
              await updateOriginalJobStatus(initialData.id);
            }
            
            await saveDataToLocal(true, docId);
            setSavedDocId(docId);
            setIsSaved(true);

        } catch (error) {
            console.error("Error guardando en Firebase, guardando localmente...", error);
            await saveDataToLocal(false);
        }
    } else {
        await saveDataToLocal(false);
    }
    setSaving(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-slate-50 min-h-screen">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa de Hoja de Trabajo</DialogTitle>
             <DialogDescription>Revisa el borrador antes de guardarlo. Este NO es el documento final.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-200 p-4">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
      
      <main className="p-4 md:p-6 space-y-8 pb-40">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-800 border-l-4 border-primary pl-4 uppercase tracking-tighter">Hoja de Trabajo</h2>
        </div>
      
      <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div className="lg:col-span-2 space-y-3">
              <StableInput label="Cliente" icon={Users} value={formData.cliente} onChange={(v: any) => handleInputChange('cliente', v)}/>
              <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={(v: any) => handleInputChange('instalacion', v)}/>
              <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: any) => handleInputChange('motor', v)}/>
              <StableInput label="N' Motor" icon={Hash} value={formData.n_motor} onChange={(v: any) => handleInputChange('n_motor', v)}/>
              <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={(v: any) => handleInputChange('grupo', v)}/>
              <StableInput label="N' Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: any) => handleInputChange('n_grupo', v)}/>
              <StableInput label="N' de Pedido" icon={Hash} value={formData.n_pedido} onChange={(v: any) => handleInputChange('n_pedido', v)}/>
            </div>
            <div className="lg:col-span-2 space-y-3">
               <StableInput label="Fecha" icon={Calendar} type="date" value={formData.fecha} onChange={(v: any) => handleInputChange('fecha', v)}/>
               <StableInput label="Técnicos" icon={User} value={formData.tecnicos} onChange={(v: any) => handleInputChange('tecnicos', v)}/>
               <StableInput label="H. Asistencia" icon={Clock} value={formData.h_asistencia} onChange={(v: any) => handleInputChange('h_asistencia', v)}/>
               <StableInput label="Tipo de Servicio" icon={Type} value={formData.tipo_servicio} onChange={(v: any) => handleInputChange('tipo_servicio', v)}/>
               <StableInput label="KMs." icon={Car} type="number" value={formData.kms} onChange={(v: any) => handleInputChange('kms', v)}/>
               <StableInput label="Dieta (€)" icon={Euro} type="number" value={formData.dieta} onChange={(v: any) => handleInputChange('dieta', v)}/>
               <div className="flex items-center gap-2 pt-2">
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={formData.media_dieta} onChange={(e: any) => handleInputChange('media_dieta', e.target.checked)} className="form-checkbox h-5 w-5 text-primary rounded" />
                    1/2 Dieta
                 </label>
                 {formData.media_dieta && <StableInput label="Cantidad" type="number" value={formData.media_dieta_cantidad} onChange={(v: any) => handleInputChange('media_dieta_cantidad', v)}/>}
               </div>
            </div>
            <div className="lg:col-span-4">
              <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'} 
                  className={`w-full bg-slate-50 border-2 rounded-lg p-3 flex items-center justify-center gap-3 font-bold shadow-sm text-sm transition-colors disabled:opacity-50 ${formData.location ? 'border-green-500 text-green-600' : 'border-slate-100 text-slate-700 hover:border-primary'}`}
              >
                  {locationStatus === 'loading' && <Loader2 className="animate-spin text-primary" size={16}/>}
                  {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 size={16}/> : <MapPin size={16}/>)}
                  <span>{formData.location ? `Ubicación Capturada: ${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación (Obligatorio)'}</span>
              </button>
            </div>
         </div>
      </section>
      
      <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Settings className="text-primary"/> Parámetros Técnicos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StableInput icon={Clock} label="Horas" value={formData.parametrosTecnicos.horas} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'horas', v)} />
              <StableInput icon={Gauge} label="Presión Aceite" value={formData.parametrosTecnicos.presionAceite} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'presionAceite', v)} />
              <StableInput icon={Zap} label="Tensión" value={formData.parametrosTecnicos.tension} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tension', v)} />
              <StableInput icon={Thermometer} label="T' (°C):" value={formData.parametrosTecnicos.temperatura} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'temperatura', v)} />
              <StableInput icon={Droplets} label="Nivel Combustible (%):" value={formData.parametrosTecnicos.nivelCombustible} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'nivelCombustible', v)} />
              <StableInput icon={Wind} label="Frecuencia (Hz):" value={formData.parametrosTecnicos.frecuencia} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'frecuencia', v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <StableInput icon={Battery} label="Tensión de baterías (V):" value={formData.parametrosTecnicos.tensionBaterias} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tensionBaterias', v)} />
              </div>
          </div>
      </section>

      <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Zap className="text-primary"/> Potencia con carga</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-4 items-end">
            <div className="md:col-span-3">
              <StableInput label="Potencia con carga" value={formData.potenciaConCarga.potencia} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potencia', v)} />
            </div>
             <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Tensión</h4>
                <div className="grid grid-cols-3 gap-2">
                    <LoadTestInput label="RS:" value={formData.potenciaConCarga.tensionRS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRS', v)} />
                    <LoadTestInput label="ST:" value={formData.potenciaConCarga.tensionST} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionST', v)} />
                    <LoadTestInput label="RT:" value={formData.potenciaConCarga.tensionRT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRT', v)} />
                </div>
            </div>
            <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Intensidad</h4>
                 <div className="grid grid-cols-3 gap-2">
                    <LoadTestInput label="R:" value={formData.potenciaConCarga.intensidadR} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadR', v)} />
                    <LoadTestInput label="S:" value={formData.potenciaConCarga.intensidadS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadS', v)} />
                    <LoadTestInput label="T:" value={formData.potenciaConCarga.intensidadT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadT', v)} />
                </div>
            </div>
            <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Potencia (kW)</h4>
                 <div className="">
                     <LoadTestInput label="kW" value={formData.potenciaConCarga.potenciaKW} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potenciaKW', v)} />
                </div>
            </div>
        </div>
      </section>

      <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Type className="text-primary"/> Trabajos Realizados</h2>
            <button onClick={improveReport} disabled={aiLoading} className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95">
                {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                Pulir con IA
            </button>
        </div>
        <textarea className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-lg p-6 outline-none focus:border-primary focus:bg-white font-medium text-slate-600 shadow-inner resize-none leading-relaxed" placeholder="Describe los trabajos realizados..." value={formData.trabajos_realizados} onChange={(e: any) => handleInputChange('trabajos_realizados', e.target.value)}/>
     </section>
     
    <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Camera className="text-primary"/> Evidencia Fotográfica</h2>
        <div>
            <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-100 border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-200 transition-colors">
                <Camera size={32} className="text-slate-400 mb-2"/>
                <span className="font-bold text-slate-600">Adjuntar Imágenes</span>
                <span className="text-xs text-slate-500">Toma una foto o selecciona archivos</span>
            </label>
            <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange}/>
        </div>
        {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img, i) => (
                    <div key={i} className="relative aspect-square">
                        <img src={URL.createObjectURL(img)} alt={`preview ${i}`} className="w-full h-full object-cover rounded-lg"/>
                    </div>
                ))}
            </div>
        )}
    </section>

    <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900">Firmas</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <SignaturePad title="Firma del Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
              <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
            </div>
            <div>
              <SignaturePad title="Conforme Cliente" signature={clientSignature} onSignatureEnd={setClientSignature} />
               <div className="mt-2">
                <StableInput label="" icon={User} value={formData.recibidoPor} onChange={(v: any) => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
              </div>
            </div>
        </div>
    </section>

    <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} disabled={saving} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-lg font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
            {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
            {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-6 bg-slate-900 text-white rounded-lg font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
          {saving ? <Loader2 className="animate-spin text-primary" /> : isSaved ? <CheckCircle2 className="text-primary" /> : <Save className="text-primary" />}
          {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR'}
        </button>
    </div>
    </main>
    </div>
  );
}
