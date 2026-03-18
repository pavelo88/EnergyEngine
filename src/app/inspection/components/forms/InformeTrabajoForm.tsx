'use client';
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Mic } from 'lucide-react';
import { splitTechnicalReport } from '@/ai/flows/split-technical-report-flow';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';
import { useGpsRequired } from '@/hooks/use-gps-required';
import ClientSelector from '../ClientSelector';
import StableInput from '../StableInput';
import { resolveInspectorEmail } from '@/lib/inspection-mode';
import { getNextSequenceForUser } from '@/lib/sequence-manager';
import { addImageSafely, getPdfFileName } from '@/lib/pdf-utils';


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
            [{ content: 'Cliente:', styles: { fontStyle: 'bold' } }, { content: report.clienteNombre || report.cliente || '-', colSpan: 3 }],
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
    
    currentY += 1;

addImageSafely(doc, report.inspectorSignatureUrl, leftMargin, currentY, 60, 25);    doc.setFontSize(10);
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


export default function InformeTrabajoForm({ initialData, aiData }: { initialData: any, aiData: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email || '');
  const canUseCloud = isOnline && !!firestore && !!user?.email;
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
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const gpsRequired = useGpsRequired();

  useEffect(() => {
    if (canUseCloud && user?.email && firestore) {
        getDoc(doc(firestore, 'usuarios', user.email)).then(snap => {
            if (snap.exists()) {
              setInspectorName(snap.data().nombre);
            } else {
              setInspectorName(user.email || '');
            }
        });
        return;
    }
    if (inspectorEmail) setInspectorName(inspectorEmail.split('@')[0]);
  }, [canUseCloud, inspectorEmail, user, firestore]);

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
      toast({
        variant: 'destructive',
        title: 'GPS no disponible',
        description: 'Este navegador no permite geolocalizacion.',
      });
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
      (error) => {
        const description =
          error.code === error.PERMISSION_DENIED
            ? 'Activa el permiso de ubicación para continuar.'
            : 'No se pudo capturar el GPS. Intenta nuevamente.';
        toast({ variant: 'destructive', title: 'No se pudo capturar GPS', description });
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
    const reportData = { ...formData, inspectorSignatureUrl: inspectorSignature };
    const docPdf = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');
    if (isSaved) {
      docPdf.save(getPdfFileName(savedDocId));
    } else {
      setPreviewPdfUrl(docPdf.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!inspectorEmail || !inspectorSignature || (gpsRequired && !formData.location)) {
        toast({
          variant: 'destructive',
          title: 'Datos incompletos',
          description: !inspectorEmail
            ? 'No existe identidad offline. Inicia online una vez para habilitar guardado local.'
            : gpsRequired && !formData.location
            ? 'En este dispositivo, la ubicación GPS es obligatoria.'
            : 'La firma del inspector es obligatoria.',
        });
        return;
    }
    if (isSaved) return;

    setSaving(true);

    const sequence = await getNextSequenceForUser({
      type: 'informe-tecnico',
      userEmail: inspectorEmail || '',
      firestore: canUseCloud ? firestore : null,
      isOnline: canUseCloud,
    });
    const names = inspectorName.split(' ');
    const inspectorInitials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'EE';
    const docId = `IT-${inspectorInitials}-${sequence.toString().padStart(4, '0')}`;
    
    const updateOriginalJobStatus = async (jobId: string) => {
        if (canUseCloud && firestore && user.email) {
            try {
                await updateDoc(doc(firestore, 'ordenes_trabajo', jobId), { estado: 'Completado' });
            } catch (updateError) {
                console.error(`Failed to update job status:`, updateError);
            }
        }
    };

    const saveDataToLocal = async (synced: boolean, firebaseId: string) => {
        const localData = { 
          ...formData, 
          originalJobId: initialData?.id || null 
        };
        if (!synced) {
            (localData as any).inspectorSignature = inspectorSignature;
        }

        await dbLocal.hojas_trabajo.add({
            firebaseId: firebaseId || '',
            synced,
            data: localData,
            createdAt: new Date(),
        });
        
        if (synced) {
            toast({ title: '¡Guardado y Sincronizado!', description: `ID: ${firebaseId}` });
        } else {
            toast({ title: 'Guardado localmente', description: 'Se sincronizará al recuperar la conexión.' });
        }
    };
    
    if (canUseCloud && firestore && user.email) {
        try {
            const formType = 'informe-tecnico';

            const storage = getStorage();
            const signatureRef = ref(storage, `firmas/${docId}/inspector.png`);
            await uploadString(signatureRef, inspectorSignature, 'data_url');
            const inspectorSignatureUrl = await getDownloadURL(signatureRef);

            const docData = {
                ...formData, imageUrls: [], inspectorSignatureUrl, clientSignatureUrl: null,
                inspectorId: inspectorEmail || '', inspectorNombre: inspectorName,
                inspectorIds: initialData?.inspectorIds || (inspectorEmail ? [inspectorEmail] : []),
                inspectorNombres: initialData?.inspectorNombres || [inspectorName],
                fecha_creacion: Timestamp.now(), formType: formData.formType || 'informe-trabajo', id: docId, estado: 'Completado' 
            };
            
            await setDoc(doc(firestore, 'informes', docId), docData);

            if (initialData?.id) {
              await updateOriginalJobStatus(initialData.id);
            }

            await saveDataToLocal(true, docId);
            setSavedDocId(docId);
            setIsSaved(true);
        } catch (e: any) { 
            console.error("Error saving document:", e);
            await saveDataToLocal(false, docId);
        }
    } else {
      await saveDataToLocal(false, docId);
    }
    setSaving(false);
  };

  return (
    <main className="max-w-4xl mx-auto md:p-6 space-y-6 animate-in fade-in bg-white min-h-screen pb-20">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white text-slate-950 light">
          <DialogHeader className="p-6 border-b border-slate-100 bg-white">
            <DialogTitle className="font-black uppercase tracking-tighter text-black">Vista Previa del Informe Técnico</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Revisa el borrador antes de guardarlo.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-100">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-xl font-black text-black border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe Técnico</h2>
      
      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
         <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Datos de Identificación</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2 space-y-2">
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
                <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={(v: string) => handleInputChange('instalacion', v)}/>
            </div>
            <div className="md:col-span-2">
              <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'} 
                  className={`w-full bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-center gap-2 font-black shadow-sm text-xs transition-all active:scale-95 disabled:opacity-50 ${formData.location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 text-slate-400 hover:border-primary'}`}
              >
                  {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14}/> : formData.location ? <CheckCircle2 size={14} className="text-emerald-500"/> : <MapPin size={14}/>}
                  <span>{formData.location ? `UBICACIÓN CAPTURADA` : (gpsRequired ? 'CAPTURAR GPS (REQUERIDO)' : 'CAPTURAR GPS (OPCIONAL)')}</span>
              </button>
            </div>
          </div>
      </section>

      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
         <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Type size={14} className="text-primary" /> Descripción de la incidencia
            </h3>
            <button onClick={handleEnhanceReport} disabled={aiLoading} className="flex items-center gap-2 text-[10px] font-black bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary/20 transition-all active:scale-95 uppercase tracking-widest">
                {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />}
                Pulir con IA
            </button>
        </div>
        <textarea 
            className="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:border-primary focus:bg-white font-medium text-black shadow-inner resize-y leading-relaxed text-sm" 
            placeholder="Dicte o escriba aquí el informe completo. La IA lo estructurará en Antecedentes, Intervención y Resumen."
            value={formData.reportContent} 
            onChange={(e: any) => handleInputChange('reportContent', e.target.value)}
        />
      </section>
      
      <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
        <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Validación</h2>
        <div>
            <SignaturePad title="Firma del Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
            <p className="text-center font-black mt-2 text-slate-400 text-[8px] uppercase">{inspectorName}</p>
        </div>
      </section>
      
      <div className="flex flex-col md:flex-row gap-3 pt-4">
        <button 
            onClick={handlePdfAction} 
            className="w-full p-5 bg-white text-black border border-slate-200 rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md hover:border-primary disabled:opacity-50"
        >
            {isSaved ? <Printer className="text-primary" size={18} /> : <FileSearch className="text-primary" size={18} />} 
            {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button 
            onClick={handleSave} 
            disabled={saving || isSaved} 
            className="w-full p-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:bg-slate-700"
        >
          {saving ? <Loader2 className="animate-spin text-white" size={18}/> : isSaved ? <CheckCircle2 className="text-emerald-400" size={18}/> : <Save className="text-white" size={18}/>} 
          {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR INFORME'}
        </button>
      </div>
    </main>
  );
}



