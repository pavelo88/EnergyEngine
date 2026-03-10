'use client';
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Mic } from 'lucide-react';
import { splitTechnicalReport } from '@/ai/flows/split-technical-report-flow';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db } from '@/lib/db-local';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18}/>}
      <input
        type={type}
        value={value || ''}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 ${Icon ? 'pl-12' : ''} outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm`}
      />
    </div>
  </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
    const doc = new jsPDF();
    const finalID = reportId || 'BORRADOR';
    const darkColor = '#0f172a';
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Márgenes
    const leftMargin = 15;
    const rightMargin = 15;
    const bottomMargin = 30;
    const topMargin = 40; // Margen superior para cuando salta de página
    const contentWidth = pageWidth - leftMargin - rightMargin;

    let currentY = topMargin;

    // 1. Título
    const title = `INFORME TÉCNICO Nº: ${finalID}`;
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, leftMargin, currentY);
    currentY += 10;
    
    // 2. Tabla de Datos
    autoTable(doc, {
        startY: currentY,
        body: [
            ['Fecha:', new Date(report.fecha).toLocaleDateString('es-ES'), 'Técnico:', inspectorName],
            [{ content: 'Cliente:', styles: { fontStyle: 'bold' } }, { content: report.cliente, colSpan: 3 }],
            [{ content: 'Instalación:', styles: { fontStyle: 'bold' } }, { content: report.instalacion, colSpan: 3 }],
            [{ content: 'UBICACIÓN (LAT/LON):', styles: { fontStyle: 'bold' } }, { content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3 }],
            ['Motor:', report.motor, 'Modelo:', report.modelo],
            ['Nº de motor:', report.n_motor, 'Grupo:', report.grupo],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, lineColor: '#ccc', lineWidth: 0.1 },
        headStyles: { fillColor: '#fff', textColor: '#000'},
        columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
        margin: { left: leftMargin, right: rightMargin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
    
    // 3. Título de Sección
    doc.setTextColor(darkColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Descripción de la incidencia", leftMargin, currentY);
    currentY += 8;

    // 4. Renderizado del Texto (El truco del justificado)
    const rawText = report.reportContent || '';
    const blocks = rawText.split('\n\n'); // Cortamos por saltos de línea dobles

    blocks.forEach((block: string) => {
        const text = block.replace(/\n/g, ' ').trim(); // Limpiamos saltos de línea simples
        
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
                styles: {
                    font: 'helvetica',
                    fontSize: 9,
                    cellPadding: 0,
                    halign: 'justify',
                    textColor: darkColor
                },
                columnStyles: {
                    0: { cellWidth: contentWidth }
                }
            });
            currentY = (doc as any).lastAutoTable.finalY + 4;
        }
    });

    // 5. Bloque de Firma
    const signatureBlockHeight = 45;
    if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
    
    currentY += 1;

    if (report.inspectorSignatureUrl) {
        doc.addImage(report.inspectorSignatureUrl, 'PNG', leftMargin, currentY, 60, 25);
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Firmado: ${inspectorName}`, leftMargin, currentY + 32);
    doc.text(`A ${new Date(report.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, leftMargin, currentY + 39);

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawPdfHeader(doc);
        drawPdfFooter(doc, i, pageCount);
    }

    return doc;
};


export default function InformeTecnicoForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState({
    formType: 'informe-tecnico',
    cliente: '',
    motor: '',
    modelo: '',
    n_motor: '',
    grupo: '',
    instalacion: '',
    location: null as { lat: number, lon: number } | null,
    fecha: new Date().toISOString().split('T')[0],
    reportContent: '',
  });
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('energy_engine_signature');
    }
    return null;
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user && user.email && db) {
        getDoc(doc(db, 'usuarios', user.email)).then(snap => {
            if (snap.exists()) {
              setInspectorName(snap.data().nombre);
            } else {
              setInspectorName(user.email || '');
            }
        });
    }
  }, [user, db]);

  useEffect(() => {
    if (initialData) {
      const combinedContent = [
        initialData.antecedentes,
        initialData.intervencion,
        initialData.resumen,
        initialData.observaciones
      ].filter(Boolean).join('\n\n');

      setFormData((prev: any) => ({
        ...prev,
        cliente: initialData.cliente || prev.cliente,
        motor: initialData.motor || initialData.equipo?.marca || prev.motor,
        modelo: initialData.modelo || initialData.equipo?.modelo || prev.modelo,
        n_motor: initialData.n_motor || initialData.equipo?.sn || prev.n_motor,
        grupo: initialData.grupo || prev.grupo,
        instalacion: initialData.instalacion || initialData.cliente?.nombre || prev.instalacion,
        reportContent: combinedContent,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (aiData) {
      setFormData((prev: any) => ({
        ...prev,
        cliente: aiData.identidad.cliente || prev.cliente,
        motor: aiData.identidad.marca || prev.motor,
        modelo: aiData.identidad.modelo || prev.modelo,
        n_motor: aiData.identidad.sn || prev.n_motor,
        grupo: aiData.identidad.n_grupo || prev.grupo,
        instalacion: aiData.identidad.instalacion || aiData.identidad.cliente || prev.instalacion,
        reportContent: aiData.observations_summary || prev.reportContent,
      }));
    }
  }, [aiData]);


  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
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

  const handleEnhanceReport = async () => {
    if (!formData.reportContent) return;
    setAiLoading(true);
    try {
      const res = await splitTechnicalReport({ dictation: formData.reportContent });
      const formattedText = `ANTECEDENTES:\n\n${res.antecedentes}\n\nINTERVENCIÓN:\n\n${res.intervencion}\n\nRESUMEN Y SITUACIÓN ACTUAL:\n\n${res.resumen}`;
      setFormData((p: any) => ({ ...p, reportContent: formattedText }));
    } catch (e: any) { 
        console.error("AI enhancement failed:", e); 
    } finally { 
        setAiLoading(false); 
    }
  };

  const handlePdfAction = () => {
    const reportData = {
    ...formData,
    inspectorSignatureUrl: inspectorSignature,
    };
    const doc = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');
    if (isSaved) {
    doc.save(`Informe_Tecnico_${savedDocId}.pdf`);
    } else {
    setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!user || !db || !user.email) {
        toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Por favor, recarga la página.' });
        return;
    }
    if (isSaved) return;
    if (!inspectorSignature) {
        toast({ variant: 'destructive', title: 'Falta Firma', description: 'La firma del inspector es obligatoria para guardar.' });
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
          formType: 'informe-tecnico',
          originalJobId: initialData?.id || null
        };
        if (!synced) {
            (localData as any).inspectorSignature = inspectorSignature;
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
            toast({ title: '¡Guardado y Sincronizado!', description: `El informe técnico ha sido guardado con el ID: ${firebaseId}` });
        }
    };
    
    if (isOnline) {
        try {
            const formType = 'informe-tecnico';
            const trabajosRef = collection(db, 'trabajos');
            const qTrabajos = query(trabajosRef, where('formType', '==', formType));
            const trabajosSnapshot = await getDocs(qTrabajos);
            const sequentialNumber = (trabajosSnapshot.size + 1).toString().padStart(3, '0');
            const year = new Date().getFullYear();
            const docId = `IT-${year}-${sequentialNumber}`;

            const storage = getStorage();
            const inspectorSignatureUrl = inspectorSignature ? await getDownloadURL(await uploadString(ref(storage, `firmas/${docId}/inspector.png`), inspectorSignature, 'data_url')) : null;

            const docData = { 
                ...formData, 
                inspectorSignatureUrl, 
                tecnicoId: user.email, 
                tecnicoNombre: inspectorName,
                fecha_creacion: Timestamp.now(), 
                formType,
                id: docId,
                estado: 'Completado',
            };
            await setDoc(doc(db, 'trabajos', docId), docData);

            if (initialData?.id) {
              await updateOriginalJobStatus(initialData.id);
            }

            await saveDataToLocal(true, docId);
            setSavedDocId(docId);
            setIsSaved(true);
        } catch (e: any) { 
            console.error("Error saving document:", e);
            await saveDataToLocal(false);
        }
    } else {
      await saveDataToLocal(false);
    }
    setSaving(false);
  };

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in bg-slate-50 min-h-screen">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa del Informe Técnico</DialogTitle>
            <DialogDescription>Revisa el borrador antes de guardarlo.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-200 p-4">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-2xl font-black text-slate-800 border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe Técnico</h2>
      
      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
         <h3 className="font-black text-slate-400 text-xs uppercase tracking-[0.2em]">Datos de Identificación</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StableInput label="Cliente" icon={User} value={formData.cliente} onChange={(v: string) => handleInputChange('cliente', v)}/>
            <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: string) => handleInputChange('motor', v)}/>
            <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={(v: string) => handleInputChange('modelo', v)}/>
            <StableInput label="Nº de motor" icon={Type} value={formData.n_motor} onChange={(v: string) => handleInputChange('n_motor', v)}/>
            <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={(v: string) => handleInputChange('grupo', v)}/>
            <div className="md:col-span-2">
                <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={(v: string) => handleInputChange('instalacion', v)}/>
            </div>
            <div className="md:col-span-2">
              <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-slate-700 shadow-sm hover:border-primary transition-colors disabled:opacity-50"
              >
                  {locationStatus === 'loading' && <Loader2 className="animate-spin text-primary" size={18}/>}
                  {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 className="text-primary" size={18}/> : <MapPin className="text-slate-400" size={18}/>)}
                  <span>{formData.location ? `${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación'}</span>
              </button>
            </div>
          </div>
      </section>

      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-8 border border-slate-100">
         <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
                <Type size={18} className="text-primary" /> Descripción de la incidencia
            </h3>
            <button onClick={handleEnhanceReport} disabled={aiLoading} className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95">
                {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                Pulir y Estructurar con IA
            </button>
        </div>
        <textarea 
            className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 outline-none focus:border-primary focus:bg-white font-medium text-slate-600 shadow-inner resize-y leading-relaxed" 
            placeholder="Dicte o escriba aquí el informe completo. La IA lo estructurará en Antecedentes, Intervención y Resumen."
            value={formData.reportContent} 
            onChange={(e: any) => handleInputChange('reportContent', e.target.value)}
        />
      </section>
      
      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="font-black text-slate-400 text-xs uppercase tracking-[0.2em]">Validación</h2>
        <div>
            <SignaturePad title="Firma del Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
            <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
        </div>
      </section>
      
      <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} className="w-full p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-[2.5rem] font-bold text-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
            {isSaved ? <Printer/> : <FileSearch/>} {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
          {saving ? <Loader2 className="animate-spin text-primary"/> : isSaved ? <CheckCircle2 className="text-primary"/> : <Save className="text-primary"/>} {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR INFORME'}
        </button>
      </div>
    </main>
  );
}
