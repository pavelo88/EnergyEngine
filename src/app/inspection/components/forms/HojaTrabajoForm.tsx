
'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Car, Euro, Zap, Thermometer, Battery, Droplets, Wind, Gauge, Camera } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={14}/>}
      <input 
        type={type}
        value={value || ''}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 ${Icon ? 'pl-10' : ''} outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-xs`}
      />
    </div>
  </div>
));

const LoadTestInput = React.memo(({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[8px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e: any) => onChange(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-xs text-center"
        />
    </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
  const doc = new jsPDF();
  const finalID = reportId || 'BORRADOR';
  const darkColor = '#0f172a';
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 40;
  const bottomMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = topMargin;

  try {
    doc.setTextColor(darkColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("HOJA DE TRABAJOS", leftMargin, currentY);

    doc.setFontSize(10);
    doc.text(`Nº: ${finalID}`, pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        body: [
            [{content: 'CLIENTE:', styles: {fontStyle: 'bold'}}, report.clienteNombre || report.cliente, {content: 'FECHA:', styles: {fontStyle: 'bold'}}, report.fecha],
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
            [`Horas: ${report.parametrosTecnicos?.horas || ''}`, `Presión Aceite: ${report.parametrosTecnicos?.presionAceite || ''}`, `Tensión: ${report.parametrosTecnicos?.tension || ''}`],
            [`Tª (°C): ${report.parametrosTecnicos?.temperatura || ''}`, `Nivel Combustible (%): ${report.parametrosTecnicos?.nivelCombustible || ''}`, `Frecuencia (Hz): ${report.parametrosTecnicos?.frecuencia || ''}`],
            [{content: `Tensión de baterías (V): ${report.parametrosTecnicos?.tensionBaterias || ''}`, colSpan: 3}],
        ],
        theme: 'grid',
        styles: {fontSize: 8, cellPadding: 1.5, minCellHeight: 8},
        bodyStyles: {fontStyle: 'bold'},
        margin: { left: leftMargin, right: rightMargin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (currentY + 45 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Potencia con carga: ${report.potenciaConCarga?.potencia || ''}`, leftMargin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        head: [['Tensión', 'Intensidad', 'Potencia (kW)']],
        body: [
            [`RS: ${report.potenciaConCarga?.tensionRS || ''}`, `R: ${report.potenciaConCarga?.intensidadR || ''}`, {rowSpan: 3, content: report.potenciaConCarga?.potenciaKW || '', styles: {valign: 'middle', halign: 'center'}}],
            [`ST: ${report.potenciaConCarga?.tensionST || ''}`, `S: ${report.potenciaConCarga?.intensidadS || ''}`],
            [`RT: ${report.potenciaConCarga?.tensionRT || ''}`, `T: ${report.potenciaConCarga?.intensidadT || ''}`],
        ],
        theme: 'grid',
        styles: {fontSize: 9, cellPadding: 1.5, minCellHeight: 8},
        headStyles: { fillColor: darkColor, textColor: '#fff' },
        bodyStyles: {fontStyle: 'bold'},
        margin: { left: leftMargin, right: rightMargin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    const signatureBlockHeight = 45;
    if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (report.inspectorSignatureUrl) {
        doc.addImage(report.inspectorSignatureUrl, 'PNG', 25, currentY, 60, 25);
    }
    doc.line(25, currentY + 25, 85, currentY + 25);
    doc.text("Firma técnico:", 25, currentY + 30);
    doc.text(inspectorName || '', 25, currentY + 35);

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
  } catch (err) {
    console.error("Error al generar PDF:", err);
  }

  return doc;
};

export default function HojaTrabajoForm({ initialData, aiData, onSuccess }: { initialData?: any, aiData?: any, onSuccess?: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorInitials, setInspectorInitials] = useState('EE');
  const [clients, setClients] = useState<any[]>([]);
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    formType: 'hoja-trabajo',
    clienteId: '',
    clienteNombre: '',
    cliente: '',
    instalacion: '',
    motor: '',
    n_motor: '',
    grupo: '',
    n_grupo: '',
    n_pedido: '',
    location: null as { lat: number, lon: number } | null,
    fecha: new Date().toISOString().split('T')[0],
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
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('energy_engine_signature');
    }
    return null;
  });
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchData = async () => {
        if (!firestore) return;
        
        try {
            const snap = await getDocs(collection(firestore, 'clientes'));
            const clientList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setClients(clientList);
            await dbLocal.clientes_cache.bulkPut(clientList as any);
        } catch (e) {
            const cached = await dbLocal.clientes_cache.toArray();
            setClients(cached);
        }

        if (user && user.email) {
            const userDocSnap = await getDoc(doc(firestore, 'usuarios', user.email));
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                setInspectorName(userData.nombre);
                setFormData(p => ({ ...p, tecnicos: userData.nombre }));
                
                const names = userData.nombre.split(' ');
                const initials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                setInspectorInitials(initials);
            }
        }
    };
    fetchData();
  }, [user, firestore]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
        ...prev,
        clienteId: initialData.clienteId || prev.clienteId,
        clienteNombre: initialData.clienteNombre || initialData.cliente || prev.clienteNombre,
        cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
        instalacion: initialData.instalacion || prev.instalacion,
        motor: initialData.modelo || prev.motor,
        n_motor: initialData.n_motor || prev.n_motor,
        trabajos_realizados: initialData.descripcion || prev.trabajos_realizados,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({...prev, [field]: value }));
  };
  
  const handleClientSelect = (clientId: string) => {
    const selected = clients.find(c => c.id === clientId);
    if (selected) {
        setFormData(p => ({ 
            ...p, 
            clienteId: clientId, 
            clienteNombre: selected.nombre,
            cliente: selected.nombre,
            instalacion: selected.direccion || p.instalacion 
        }));
    }
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
      toast({ variant: 'destructive', title: 'Error de GPS', description: 'Tu dispositivo no soporta geolocalización.' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
        toast({ title: 'GPS Capturado', description: 'Ubicación registrada correctamente.' });
      },
      () => {
        toast({ variant: 'destructive', title: 'Error de GPS', description: 'Por favor, activa los permisos de ubicación.' });
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
       toast({ title: '¡Reporte Mejorado!', description: 'La IA ha estructurado el texto formalmente.' });
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo procesar con IA. Use texto manual.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePdfAction = (forceDownload = false) => {
    if (!formData.clienteId) {
        toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Seleccione un Cliente para previsualizar.' });
        return;
    }
    
    setPdfLoading(true);
    setTimeout(() => {
      try {
        const reportData = { ...formData, inspectorSignatureUrl: inspectorSignature, clientSignatureUrl: clientSignature };
        const docPdf = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');
        
        if (isSaved || forceDownload) {
            docPdf.save(`Hoja_Trabajo_${savedDocId || 'Borrador'}.pdf`);
        } else {
            const uri = docPdf.output('datauristring');
            setPreviewPdfUrl(uri);
        }
      } catch (e) {
        console.error("Fallo al generar PDF:", e);
        toast({ variant: "destructive", title: "Error de PDF", description: "No se pudo generar el documento." });
      } finally {
        setPdfLoading(false);
      }
    }, 500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSave = async () => {
    if (!user || !user.email) return;
    
    if (!formData.clienteId || !formData.location || !inspectorSignature || !clientSignature) {
      toast({ variant: 'destructive', title: 'Datos Incompletos', description: 'Cliente, Ubicación GPS y ambas firmas son obligatorias.' });
      return;
    }

    setSaving(true);

    const sequence = await dbLocal.getNextSequence('hoja-trabajo');
    const year = new Date().getFullYear();
    const docId = `HT-${year}-${inspectorInitials}-${sequence.toString().padStart(3, '0')}`;

    const saveDataToLocal = async (synced: boolean, firebaseId: string) => {
        const localData = { ...formData, originalJobId: initialData?.id || null };
        if (!synced) {
            (localData as any).inspectorSignature = inspectorSignature;
            (localData as any).clientSignature = clientSignature;
        }
        await dbLocal.hojas_trabajo.add({ 
            firebaseId, 
            synced, 
            data: localData, 
            createdAt: new Date() 
        });
        
        setSavedDocId(firebaseId);
        setIsSaved(true);
        setSaving(false);

        if (synced) toast({ title: '¡Sincronizado!', description: `Informe guardado con ID: ${firebaseId}` });
        else toast({ title: 'Guardado Localmente', description: `Informe registrado como ${firebaseId}. Se subirá al recuperar conexión.` });

        const shouldDownload = window.confirm("¡Informe guardado con éxito! ¿Desea descargar el PDF ahora?");
        if (shouldDownload) {
            handlePdfAction(true);
        }
        
        if (onSuccess) onSuccess();
    };

    if (isOnline && firestore) {
        try {
            const storage = getStorage();
            const imageUrls = await Promise.all(images.map(async (image) => {
                const imgRef = ref(storage, `informes/${docId}/${image.name}`);
                await uploadBytes(imgRef, image);
                return getDownloadURL(imgRef);
            }));

            const inspRef = ref(storage, `firmas/${docId}/inspector.png`);
            await uploadString(inspRef, inspectorSignature!, 'data_url');
            const inspectorSignatureUrl = await getDownloadURL(inspRef);

            const cliRef = ref(storage, `firmas/${docId}/cliente.png`);
            await uploadString(cliRef, clientSignature!, 'data_url');
            const clientSignatureUrl = await getDownloadURL(cliRef);
            
            const docData = {
                ...formData, imageUrls, inspectorSignatureUrl, clientSignatureUrl,
                tecnicoId: user.email, tecnicoNombre: inspectorName,
                fecha_creacion: Timestamp.now(), id: docId, estado: 'Completado',
            };
            
            await setDoc(doc(firestore, 'trabajos', docId), docData);
            if (initialData?.id) await updateDoc(doc(firestore, 'trabajos', initialData.id), { estado: 'Completado' });
            
            await saveDataToLocal(true, docId);
        } catch (error: any) {
            console.error("Error al guardar en la nube:", error);
            await saveDataToLocal(false, docId);
        }
    } else {
        await saveDataToLocal(false, docId);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-slate-50">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden">
          <DialogHeader className="p-4 border-b bg-white">
            <DialogTitle className="font-black uppercase tracking-tighter">Borrador de Informe Técnico</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Previsualice el documento antes de realizar el guardado final.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-200">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full border-none" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
      
      <main className="space-y-6">
        <h2 className="text-xl font-black text-slate-800 border-l-4 border-primary pl-4 uppercase tracking-tighter">Hoja de Trabajo</h2>
      
        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Base</label>
                <Select value={formData.clienteId} onValueChange={handleClientSelect}>
                    <SelectTrigger className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 font-bold h-12">
                        <SelectValue placeholder="SELECCIONAR CLIENTE..." />
                    </SelectTrigger>
                    <SelectContent className='rounded-xl'>
                        {clients.map(c => <SelectItem key={c.id} value={c.id} className='font-bold uppercase text-xs'>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>
                
                <StableInput label="Instalación / Sede" icon={MapPin} value={formData.instalacion} onChange={(v: any) => handleInputChange('instalacion', v)}/>
                <StableInput label="Motor / Equipo" icon={Settings} value={formData.motor} onChange={(v: any) => handleInputChange('motor', v)}/>
                <StableInput label="N' Motor" icon={Hash} value={formData.n_motor} onChange={(v: any) => handleInputChange('n_motor', v)}/>
                <StableInput label="Grupo Electrógeno" icon={Settings} value={formData.grupo} onChange={(v: any) => handleInputChange('grupo', v)}/>
                <StableInput label="N' Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: any) => handleInputChange('n_grupo', v)}/>
                <StableInput label="N' de Pedido / OC" icon={Hash} value={formData.n_pedido} onChange={(v: any) => handleInputChange('n_pedido', v)}/>
              </div>
              <div className="lg:col-span-2 space-y-2">
                 <StableInput label="Fecha" icon={Calendar} type="date" value={formData.fecha} onChange={(v: any) => handleInputChange('fecha', v)}/>
                 <StableInput label="Técnicos Intervinientes" icon={User} value={formData.tecnicos} onChange={(v: any) => handleInputChange('tecnicos', v)}/>
                 <StableInput label="H. Asistencia" icon={Clock} value={formData.h_asistencia} onChange={(v: any) => handleInputChange('h_asistencia', v)}/>
                 <StableInput label="Tipo de Servicio" icon={Type} value={formData.tipo_servicio} onChange={(v: any) => handleInputChange('tipo_servicio', v)}/>
                 <StableInput label="Kilómetros" icon={Car} type="number" value={formData.kms} onChange={(v: any) => handleInputChange('kms', v)}/>
                 <StableInput label="Dieta (€)" icon={Euro} type="number" value={formData.dieta} onChange={(v: any) => handleInputChange('dieta', v)}/>
                 <div className="flex items-center gap-2 pt-1.5">
                   <label className="flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={formData.media_dieta} onChange={(e: any) => handleInputChange('media_dieta', e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded border-2" />
                      1/2 DIETA
                   </label>
                   {formData.media_dieta && <StableInput label="Cantidad" type="number" value={formData.media_dieta_cantidad} onChange={(v: any) => handleInputChange('media_dieta_cantidad', v)}/>}
                 </div>
              </div>
              <div className="lg:col-span-4 pt-2">
                <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'}
                  className={`w-full p-3 border border-slate-200 rounded-xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 text-xs ${formData.location ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-100 hover:border-primary text-slate-400'}`}
                >
                    {locationStatus === 'loading' ? <Loader2 className="animate-spin" size={14} /> : formData.location ? <CheckCircle2 size={14} /> : <MapPin size={14}/>}
                    {formData.location ? `COORDENADAS: ${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'VINCULAR UBICACIÓN GPS (REQUERIDO)'}
                </button>
              </div>
           </div>
        </section>
        
        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter"><Settings className="text-primary" size={18}/> Parámetros Técnicos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StableInput icon={Clock} label="Horas" value={formData.parametrosTecnicos.horas} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'horas', v)} />
                <StableInput icon={Gauge} label="Presión Aceite" value={formData.parametrosTecnicos.presionAceite} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'presionAceite', v)} />
                <StableInput icon={Zap} label="Tensión" value={formData.parametrosTecnicos.tension} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tension', v)} />
                <StableInput icon={Thermometer} label="Tª (°C):" value={formData.parametrosTecnicos.temperatura} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'temperatura', v)} />
                <StableInput icon={Droplets} label="Nivel Combustible (%):" value={formData.parametrosTecnicos.nivelCombustible} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'nivelCombustible', v)} />
                <StableInput icon={Wind} label="Frecuencia (Hz):" value={formData.parametrosTecnicos.frecuencia} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'frecuencia', v)} />
                <div className="col-span-2">
                  <StableInput icon={Battery} label="Tensión baterías (V):" value={formData.parametrosTecnicos.tensionBaterias} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tensionBaterias', v)} />
                </div>
            </div>
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter"><Zap className="text-primary" size={18}/> Potencia con carga</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-3 items-end">
              <div className="md:col-span-3">
                <StableInput label="Potencia con carga" value={formData.potenciaConCarga.potencia} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potencia', v)} />
              </div>
               <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">Tensión</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                      <LoadTestInput label="RS" value={formData.potenciaConCarga.tensionRS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRS', v)} />
                      <LoadTestInput label="ST" value={formData.potenciaConCarga.tensionST} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionST', v)} />
                      <LoadTestInput label="RT" value={formData.potenciaConCarga.tensionRT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRT', v)} />
                  </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">Intensidad</h4>
                   <div className="grid grid-cols-3 gap-1.5">
                      <LoadTestInput label="R" value={formData.potenciaConCarga.intensidadR} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadR', v)} />
                      <LoadTestInput label="S" value={formData.potenciaConCarga.intensidadS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadS', v)} />
                      <LoadTestInput label="T" value={formData.potenciaConCarga.intensidadT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadT', v)} />
                  </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">Potencia (kW)</h4>
                   <LoadTestInput label="kW" value={formData.potenciaConCarga.potenciaKW} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potenciaKW', v)} />
              </div>
          </div>
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <div className="flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-tighter">Trabajos Realizados</h2>
              <button 
                onClick={improveReport} 
                disabled={aiLoading} 
                className="flex items-center gap-2 text-[8px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors active:scale-95 disabled:opacity-50"
              >
                  {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} 
                  {aiLoading ? 'PROCESANDO...' : 'ESTRUCTURAR CON IA'}
              </button>
          </div>
          <textarea 
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none font-medium text-slate-600 outline-none focus:border-primary transition-all shadow-inner text-sm" 
            value={formData.trabajos_realizados} 
            onChange={(e: any) => handleInputChange('trabajos_realizados', e.target.value)} 
            placeholder="Describa aquí detalladamente las intervenciones realizadas..."
          />
       </section>
       
      <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter"><Camera className="text-primary" size={18}/> Evidencia Fotográfica</h2>
          <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center hover:bg-white hover:border-primary transition-all group active:scale-[0.99]">
              <Camera size={32} className="text-slate-300 mb-1.5 group-hover:text-primary transition-colors"/>
              <span className="font-black text-slate-400 group-hover:text-slate-600 uppercase tracking-widest text-[10px]">Adjuntar Imágenes del Trabajo</span>
          </label>
          <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange}/>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img, i) => (
                  <div key={i} className="aspect-square relative group overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                      <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                  </div>
              ))}
          </div>
      </section>

      <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-6 border border-slate-100">
          <h2 className="text-lg font-black uppercase tracking-tighter">Validación y Firmas</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
              <div>
                <SignaturePad title="Firma del Técnico Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
                <p className="text-center font-black mt-2 text-slate-400 text-[8px] uppercase tracking-widest">{inspectorName}</p>
              </div>
              <div>
                <SignaturePad title="Conforme Cliente / Receptor" signature={clientSignature} onSignatureEnd={setClientSignature} />
                <div className="mt-3">
                  <StableInput label="Nombre de la persona que recibe" icon={User} value={formData.recibidoPor} onChange={(v: any) => handleInputChange('recibidoPor', v)} placeholder="Nombre completo"/>
                </div>
              </div>
          </div>
      </section>

      <div className="flex flex-col md:flex-row gap-3 pt-4">
          <button 
            onClick={() => handlePdfAction(false)} 
            disabled={pdfLoading}
            className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-bold flex items-center justify-center gap-3 hover:border-primary transition-all text-slate-700 shadow-md active:scale-95 disabled:opacity-50 text-sm"
          >
              {pdfLoading ? <Loader2 className="animate-spin text-primary" size={18}/> : isSaved ? <Printer size={18} className="text-primary"/> : <FileSearch size={18} className="text-primary"/>}
              {pdfLoading ? 'GENERANDO...' : isSaved ? 'IMPRIMIR HOJA FINAL' : 'VISTA PREVIA PDF'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || isSaved} 
            className="w-full p-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 disabled:bg-slate-700 shadow-xl active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="animate-spin text-primary" size={18} /> : isSaved ? <CheckCircle2 className="text-primary" size={18} /> : <Save className="text-primary" size={18} />}
            {saving ? 'GUARDANDO DATOS...' : isSaved ? 'HOJA GUARDADA' : 'FINALIZAR Y GUARDAR'}
          </button>
      </div>
      </main>
    </div>
  );
}
