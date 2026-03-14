'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, MapPin, Settings, Type } from 'lucide-react';
import { splitTechnicalReport } from '@/ai/flows/split-technical-report-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';
import ClientSelector from '../ClientSelector';
import StableInput from '../StableInput';

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
    const doc = new jsPDF();
    const finalID = reportId || 'BORRADOR';
    const darkColor = '#0f172a';
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    const leftMargin = 15;
    const rightMargin = 15;
    const bottomMargin = 30;
    const topMargin = 40;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    let currentY = topMargin;

    try {
        const title = `INFORME TÉCNICO Nº: ${finalID}`;
        doc.setTextColor(darkColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title, leftMargin, currentY);
        currentY += 10;
        
        autoTable(doc, {
            startY: currentY,
            body: [
                ['Fecha:', new Date(report.fecha).toLocaleDateString('es-ES'), 'Técnico:', inspectorName],
                [{ content: 'Cliente:', styles: { fontStyle: 'bold' } }, { content: report.clienteNombre || report.cliente || 'N/A', colSpan: 3 }],
                [{ content: 'Instalación:', styles: { fontStyle: 'bold' } }, { content: report.instalacion || 'N/A', colSpan: 3 }],
                [{ content: 'UBICACIÓN:', styles: { fontStyle: 'bold' } }, { content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3 }],
                ['Motor:', report.motor || '-', 'Modelo:', report.modelo || '-'],
                ['Nº de motor:', report.n_motor || '-', 'Grupo:', report.grupo || '-'],
            ],
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, lineColor: '#ccc', lineWidth: 0.1 },
            columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
            margin: { left: leftMargin, right: rightMargin },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setTextColor(darkColor);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("Descripción de la incidencia", leftMargin, currentY);
        currentY += 8;

        const rawText = report.reportContent || '';
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

        const signatureBlockHeight = 45;
        if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
          doc.addPage();
          currentY = topMargin;
        }
        
        currentY += 5;

        if (report.inspectorSignatureUrl) {
            try {
                doc.addImage(report.inspectorSignatureUrl, 'PNG', leftMargin, currentY, 60, 25);
            } catch (e) { console.error("Could not add signature to PDF:", e); }
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Firmado: ${inspectorName}`, leftMargin, currentY + 32);
        doc.text(`A ${new Date(report.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, leftMargin, currentY + 39);

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            try { drawPdfHeader(doc); } catch(e) { console.error("Header fail:", e); }
            drawPdfFooter(doc, i, pageCount);
        }
    } catch (error) {
        console.error("PDF Final Generation failed:", error);
    }
    return doc;
};


export default function InformeTecnicoForm({ initialData, aiData, onSuccess }: { initialData?: any, aiData?: any, onSuccess?: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState({
    formType: 'informe-tecnico',
    clienteId: '',
    clienteNombre: '',
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user && user.email && firestore) {
        getDoc(doc(firestore, 'usuarios', user.email)).then(snap => {
            if (snap.exists()) setInspectorName(snap.data().nombre);
            else setInspectorName(user.displayName || user.email || 'Técnico Especialista');
        });
    }
  }, [user, firestore]);

  useEffect(() => {
    if (initialData) {
      const combinedContent = [initialData.antecedentes, initialData.intervencion, initialData.resumen, initialData.observaciones, initialData.descripcion].filter(Boolean).join('\n\n');
      setFormData((prev: any) => ({
        ...prev,
        cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
        motor: initialData.modelo || prev.motor,
        modelo: initialData.n_motor || prev.modelo,
        n_motor: initialData.n_motor || prev.n_motor,
        grupo: initialData.grupo || prev.grupo,
        instalacion: initialData.instalacion || prev.instalacion,
        reportContent: combinedContent || prev.reportContent,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (aiData) {
      setFormData((prev: any) => ({
        ...prev,
        cliente: aiData.identidad?.cliente || prev.cliente,
        motor: aiData.identidad?.marca || prev.motor,
        modelo: aiData.identidad?.modelo || prev.modelo,
        n_motor: aiData.identidad?.sn || prev.n_motor,
        grupo: aiData.identidad?.n_grupo || prev.grupo,
        instalacion: aiData.identidad?.instalacion || prev.instalacion,
        reportContent: aiData.observations_summary || prev.reportContent,
        observaciones: aiData.observations_summary || prev.observaciones
      }));
    }
  }, [aiData]);


  const handleClientSelect = (client: any) => {
    setFormData((prev: any) => ({
      ...prev,
      clienteId: client.id,
      cliente: client.nombre,
      clienteNombre: client.nombre,
      instalacion: client.direccion || prev.instalacion
    }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error GPS', description: 'Tu dispositivo no soporta geolocalización.' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
        toast({ title: 'GPS OK', description: 'Ubicación registrada con éxito.' });
      },
      () => { 
        toast({ variant: 'destructive', title: 'GPS Fallido', description: 'Active permisos de ubicación.' });
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
      toast({ title: '¡Pulido por IA!', description: 'El reporte ha sido estructurado formalmente.' });
    } catch (e: any) { 
        console.error("AI Error:", e);
        toast({ 
          variant: 'destructive', 
          title: 'IA no disponible', 
          description: 'Error de servidor. El informe se mantendrá como texto manual.' 
        });
    } finally { setAiLoading(false); }
  };

  const handlePdfAction = useCallback((forceDownload = false) => {
    if (!formData.cliente || !formData.instalacion) {
        toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Cliente e Instalación son obligatorios para generar PDF.' });
        return;
    }
    setPdfLoading(true);
    console.log("Generando PDF para previsualización...", formData);
    
    setTimeout(() => {
        try {
            const reportData = { ...formData, inspectorSignatureUrl: inspectorSignature };
            const docPdf = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');
            
            if (isSaved || forceDownload) {
                console.log("Descargando PDF final...");
                docPdf.save(`Informe_Tecnico_${savedDocId || 'Borrador'}.pdf`);
            } else {
                console.log("Creando Blob URL para previsualización...");
                const blob = docPdf.output('blob');
                const url = URL.createObjectURL(blob);
                setPreviewPdfUrl(url);
            }
        } catch (e) {
            console.error("Error al generar PDF:", e);
            toast({ variant: 'destructive', title: 'Error PDF', description: 'No se pudo generar el documento. Revisa la consola.' });
        } finally {
            setPdfLoading(false);
        }
    }, 300);
  }, [formData, inspectorSignature, inspectorName, isSaved, savedDocId, toast]);

  const handleSave = async () => {
    if (!firestore || !user?.email) return;
    
    const missing = [];
    if (!formData.cliente) missing.push('Cliente');
    if (!formData.instalacion) missing.push('Instalación');
    if (!formData.location) missing.push('Ubicación GPS');
    if (!inspectorSignature) missing.push('Firma Inspector');

    if (missing.length > 0) {
        toast({ 
          variant: 'destructive', 
          title: 'Datos Incompletos', 
          description: `Por favor complete: ${missing.join(', ')}` 
        });
        return;
    }

    setSaving(true);
    
    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
        const localData = { ...formData, originalJobId: initialData?.id || null };
        if (!synced) (localData as any).inspectorSignature = inspectorSignature;
        await dbLocal.hojas_trabajo.add({ firebaseId: firebaseId || '', synced, data: localData, createdAt: new Date() });
        
        setSaving(false);
        setSavedDocId(firebaseId || '');
        setIsSaved(true);

        if (synced) {
            toast({ title: '¡Informe Sincronizado!', description: `Guardado con éxito. ID: ${firebaseId}` });
        } else {
            toast({ 
              title: 'Guardado Localmente', 
              description: 'Error de red. Se sincronizará automáticamente después.' 
            });
        }

        const shouldDownload = window.confirm("¡Informe guardado con éxito! ¿Desea descargar el PDF ahora?");
        if (shouldDownload) {
            handlePdfAction(true);
        }
        
        if (onSuccess) onSuccess();
    };
    
    if (isOnline) {
        try {
            const formType = 'informe-tecnico';
            const sequence = await dbLocal.getNextSequence('informe-tecnico');
            const names = inspectorName.split(' ');
            const inspectorInitials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'EE';
            const docId = `IT-${inspectorInitials}-${sequence.toString().padStart(4, '0')}`;
            const storage = getStorage();
            
            let inspectorSignatureUrl = null;
            try {
              const signatureRef = ref(storage, `firmas/${docId}/inspector.png`);
              await uploadString(signatureRef, inspectorSignature!, 'data_url');
              inspectorSignatureUrl = await getDownloadURL(signatureRef);
            } catch (storageErr) {
              console.warn("Storage Error (likely CORS):", storageErr);
              throw new Error("STORAGE_CORS_ERROR");
            }

            const docData = { 
                ...formData, inspectorSignatureUrl, clientSignatureUrl: null, 
                inspectorId: user.email, inspectorNombre: inspectorName, 
                inspectorIds: initialData?.inspectorIds || [user.email],
                inspectorNombres: initialData?.inspectorNombres || [inspectorName],
                fecha_creacion: Timestamp.now(), formType: formData.formType || 'informe-tecnico', id: docId, estado: 'Completado' 
            };
            
            await setDoc(doc(firestore, 'informes', docId), docData);
            if (initialData?.id) await updateDoc(doc(firestore, 'ordenes_trabajo', initialData.id), { estado: 'Completado' });

            await saveDataToLocal(true, docId);
        } catch (e: any) { 
            console.error("Cloud save failed:", e);
            await saveDataToLocal(false);
        }
    } else {
      await saveDataToLocal(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-20 bg-white min-h-screen">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => {
        if (!isOpen && previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
        }
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border-slate-100 bg-white">
          <DialogHeader className="p-6 border-b border-slate-100 bg-white">
            <DialogTitle className="font-black uppercase tracking-tighter text-black">Borrador Informe Técnico</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Documento profesional para validación de intervenciones.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-100">
            {previewPdfUrl ? (
              <iframe src={previewPdfUrl} className="w-full h-full border-none" title="PDF Preview" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <Loader2 className="animate-spin text-primary" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-xl font-black text-black border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe de Intervención Técnica</h2>
      
      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente Base</label>
                <div className="bg-white border border-slate-100 rounded-2xl">
                    <ClientSelector onSelect={handleClientSelect} selectedClientId={formData.clienteId} />
                </div>
            </div>
            <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: string) => handleInputChange('motor', v)}/>
            <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={(v: string) => handleInputChange('modelo', v)}/>
            <StableInput label="Nº de motor" icon={Type} value={formData.n_motor} onChange={(v: string) => handleInputChange('n_motor', v)}/>
            <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={(v: string) => handleInputChange('grupo', v)}/>
            <div className="md:col-span-2">
                <StableInput label="Instalación / Ubicación Específica" icon={MapPin} value={formData.instalacion} onChange={(v: string) => handleInputChange('instalacion', v)}/>
            </div>
            <div className="md:col-span-2">
              <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'} 
                  className={`w-full p-4 border rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-xs 
                    ${formData.location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 text-slate-400 hover:border-primary'}`}
              >
                  {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14}/> : <MapPin size={14}/>}
                  <span>{formData.location ? `${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'CAPTURAR UBICACIÓN GPS'}</span>
              </button>
            </div>
          </div>
      </section>

      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
         <div className="flex justify-between items-center">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalles de la Incidencia</h3>
            <button onClick={handleEnhanceReport} disabled={aiLoading} className="flex items-center gap-2 text-[8px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95">
                {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} 
                {aiLoading ? 'ESTRUCTURANDO...' : 'IA ESTRUCTURAR'}
            </button>
        </div>
        <textarea 
            className="w-full h-56 bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:border-primary focus:bg-white font-medium text-black transition-all resize-none shadow-inner leading-relaxed text-sm" 
            placeholder="Escriba o dicte aquí el informe completo. Use la IA para separar automáticamente en Antecedentes, Intervención y Situación Actual."
            value={formData.reportContent} 
            onChange={(e: any) => handleInputChange('reportContent', e.target.value)}
        />
      </section>
      
      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <SignaturePad title="Firma del Técnico Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
        <p className="text-center font-black text-slate-400 text-[8px] uppercase tracking-widest mt-2">{inspectorName}</p>
      </section>
      
      <div className="flex flex-col md:flex-row gap-4 pt-4">
        <button 
            onClick={() => handlePdfAction(false)} 
            disabled={pdfLoading}
            className="w-full p-5 bg-white text-black border border-slate-200 rounded-[1.5rem] font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-all hover:border-primary shadow-md disabled:opacity-50"
        >
            {pdfLoading ? <Loader2 className="animate-spin text-primary" size={18}/> : isSaved ? <Printer className="text-primary" size={18}/> : <FileSearch className="text-primary" size={18}/>} 
            {pdfLoading ? 'GENERANDO...' : 'VISTA PREVIA PDF'}
        </button>
        <button 
            onClick={handleSave} 
            disabled={saving || isSaved} 
            className="w-full p-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shadow-xl disabled:bg-slate-700"
        >
          {saving ? <Loader2 className="animate-spin text-white" size={18}/> : isSaved ? <CheckCircle2 className="text-white" size={18}/> : <Save className="text-white" size={18}/>} 
          {saving ? 'GUARDANDO INFORME...' : isSaved ? 'INFORME GUARDADO' : 'CERRAR Y GUARDAR'}
        </button>
      </div>
    </main>
  );
}
