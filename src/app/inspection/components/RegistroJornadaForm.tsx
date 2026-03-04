'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Save, Loader2, User, Euro, Trash2, Plus, 
  FileText, ClipboardSignature, Upload, Camera, Calendar as CalendarIcon, FileSearch, Building, Clock, AlertTriangle, MapPin, CheckCircle2
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';

// --- TIPOS DE DATOS ---
type GastoItem = {
  rubro: string;
  monto: number;
  descripcion:string;
  forma_pago: string;
  comprobanteUrl?: string;
  comprobanteFile?: File;
};

const initialGastoState = { rubro: 'Alimentación', monto: '', descripcion: '', forma_pago: 'Tarjeta Empresa', comprobanteFile: undefined };

// --- COMPONENTE PRINCIPAL ---
export default function RegistroJornadaForm() {
  const { user } = useUser();
  const db = useFirestore();
  const storage = db ? getStorage(db.app) : null;

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [observacionesDiarias, setObservacionesDiarias] = useState('');
  const [ubicacionPrincipal, setUbicacionPrincipal] = useState<{ lat: number, lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lugarTrabajo, setLugarTrabajo] = useState('');

  // Estado para las horas
  const [horas, setHoras] = useState({
      normales: '',
      extrasTipo1: '', // Ej: Horas extra normales
      extrasTipo2: ''  // Ej: Horas extra especiales
  });

  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE FIRMA ---
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a';

    const getPos = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }
    const start = (e: any) => { drawing = true; draw(e) };
    const end = () => { if(drawing) { drawing = false; ctx.beginPath(); setSignature(canvas.toDataURL()); }};
    const draw = (e: any) => {
        if (!drawing) return; e.preventDefault();
        const { x, y } = getPos(e);
        ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', end); canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchmove', draw, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mouseup', end); canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchend', end);
      canvas.removeEventListener('touchmove', draw);
    };
  }, []);

  const clearCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setSignature(null);
    }
  };

    const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no es soportada por tu navegador.');
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUbicacionPrincipal({ lat: latitude, lon: longitude });
        setLocationStatus('success');
      },
      () => {
        alert("No se pudo obtener la ubicación. Por favor, asegúrate de que los permisos de localización están activados para esta página en los ajustes de tu navegador e inténtalo de nuevo.");
        setLocationStatus('error');
      }
    );
  };

  // --- LÓGICA DEL FORMULARIO ---
  const handleHorasChange = (field: string, value: string) => {
      setHoras((prev: any) => ({...prev, [field]: value}));
  };

  const handleAddGasto = () => {
    if (!currentGasto.monto || !currentGasto.descripcion) {
      return alert("El monto y la descripción del gasto son obligatorios.");
    }
    setGastos([...gastos, { ...currentGasto, monto: parseFloat(currentGasto.monto) }]);
    setCurrentGasto(initialGastoState);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setCurrentGasto((prev: any) => ({ ...prev, comprobanteFile: e.target.files![0] }));
    }
  };

  const totalGastos = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);

  // --- LÓGICA DE PDF ---
  const createParteDiarioPDF = (data: any) => {
    const doc = new jsPDF();
    const darkColor = '#0f172a';
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 40;
    const bottomMargin = 30;
    const globalMargin = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };

    let currentY = topMargin;

    // Título Principal
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PARTE DE TRABAJO DIARIO - Nº: ${data.id || 'BORRADOR'}`, leftMargin, currentY);
    currentY += 8;
    
    // Datos del Técnico y Fecha
    autoTable(doc, {
        startY: currentY,
        body: [
            [{ content: 'TÉCNICO:', styles: { fontStyle: 'bold', cellWidth: 30 } }, { content: data.inspectorNombre || 'No especificado', colSpan: 3 }],
            [{ content: 'FECHA:', styles: { fontStyle: 'bold' } }, format(data.fecha, 'dd/MM/yyyy'), { content: 'DÍA DE LA SEMANA:', styles: { fontStyle: 'bold', cellWidth: 40 } }, format(data.fecha, 'EEEE', { locale: es }).toUpperCase()],
            [{ content: 'UBICACIÓN PRINCIPAL:', styles: { fontStyle: 'bold', cellWidth: 40 } }, { content: data.ubicacionPrincipal ? `${data.ubicacionPrincipal.lat.toFixed(4)}, ${data.ubicacionPrincipal.lon.toFixed(4)}` : 'No registrada', colSpan: 3 }],
        ],
        theme: 'grid', 
        styles: { fontSize: 9, cellPadding: 3 },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Resumen de Horas
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("REGISTRO DE HORAS", leftMargin, currentY);
    currentY += 4;

    autoTable(doc, {
        startY: currentY,
        head: [['Lugar de Trabajo', 'Horas Normales', 'Horas Extra (Tipo 1)', 'Horas Extras Especiales', 'Total Horas']],
        body: [[
            data.lugarTrabajo,
            data.horas.normales || '0', 
            data.horas.extrasTipo1 || '0', 
            data.horas.extrasTipo2 || '0',
            (parseFloat(data.horas.normales || '0') + parseFloat(data.horas.extrasTipo1 || '0') + parseFloat(data.horas.extrasTipo2 || '0')).toString()
        ]],
        theme: 'grid',
        headStyles: { fillColor: darkColor, textColor: '#FFFFFF', halign: 'center' },
        styles: { fontSize: 10, cellPadding: 4, halign: 'center', fontStyle: 'bold' },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Observaciones Diarias
    if (data.observaciones) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text("OBSERVACIONES DEL DÍA", leftMargin, currentY);
        currentY += 4;

        autoTable(doc, {
            startY: currentY,
            body: [[data.observaciones]],
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 0, halign: 'justify', textColor: darkColor },
            margin: globalMargin
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    // Comprobamos si cabe la tabla de gastos
    if (currentY + 30 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    // Tabla de Gastos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`GASTOS DEL DÍA (Total: ${data.monto.toFixed(2)} €)`, leftMargin, currentY);
    currentY += 4;

    if (data.gastos.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Rubro', 'Descripción', 'Forma Pago', 'Ticket', 'Monto (€)']],
        body: data.gastos.map((g: any) => [
            g.rubro, 
            g.descripcion, 
            g.forma_pago, 
            g.comprobanteUrl || g.comprobanteFile ? 'Sí (Adjunto)' : 'No', 
            g.monto.toFixed(2)
        ]),
        theme: 'grid',
        headStyles: { fillColor: darkColor, textColor: '#FFFFFF' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
        margin: globalMargin
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text("No se registraron gastos en esta jornada.", leftMargin, currentY);
        currentY += 10;
    }

    // Firma del Técnico
    const signatureBlockHeight = 40;
    if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if(data.firmaUrl) {
      doc.addImage(data.firmaUrl, 'PNG', 15, currentY, 60, 25);
    }
    doc.line(15, currentY + 25, 85, currentY + 25);
    doc.setFont('helvetica', 'bold');
    doc.text("Firma del Técnico", 15, currentY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(data.inspectorNombre || '', 15, currentY + 35);
    
    // Encabezado y Pie de página globales
    const drawHeader = () => {
        doc.setFillColor(darkColor);
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("ENERGY ENGINE", 15, 18);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("administracion@energyengine.es | serviciotecnico@energyengine.es", pageWidth - 15, 12, { align: 'right' });
        doc.text("Tel: 92 515 43 53", pageWidth - 15, 18, { align: 'right' });
    };

    const drawFooter = (pageNumber: number, totalPages: number) => {
        doc.setFontSize(8);
        doc.setTextColor('#94A3B8');
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
        doc.setFillColor(darkColor);
        doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
    };

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        drawHeader();
        drawFooter(i, pageCount);
    }

    return doc;
  }

  const handlePreviewPDF = () => {
    if (!user) return alert("Error de autenticación. Por favor, recarga la página.");
    if (!horas.normales) return alert("Por favor, introduce al menos las horas normales trabajadas.");
    
    const parteDataForPreview = {
        inspectorNombre: user.displayName || user.email,
        fecha: reportDate,
        ubicacionPrincipal: ubicacionPrincipal,
        lugarTrabajo,
        horas: horas,
        observaciones: observacionesDiarias,
        gastos: gastos,
        monto: totalGastos,
        firmaUrl: signature,
    };
    const doc = createParteDiarioPDF(parteDataForPreview);
    const pdfDataUri = doc.output('datauristring');
    setPreviewPdfUrl(pdfDataUri);
  }

  const generateAndUploadPDF = async (data: any, docId: string) => {
    if(!storage) throw new Error("Storage not available");
    const doc = createParteDiarioPDF(data);
    const pdfDataUri = doc.output('datauristring');
    const storageRef = ref(storage, `partes_diarios/${docId}.pdf`);
    await uploadString(storageRef, pdfDataUri, 'data_url');
    return getDownloadURL(storageRef);
  };

  const handleSaveParte = async () => {
    if (!user || !db || !storage) return alert("Error de autenticación o servicios no disponibles.");
    if (!horas.normales) return alert("Por favor, introduce al menos las horas normales trabajadas.");
    if (!signature) return alert("La firma del técnico es obligatoria para validar la jornada.");
    if (!ubicacionPrincipal) return alert("La ubicación principal es obligatoria para iniciar la jornada.");

    setLoading(true);
    try {
        const docId = `DIA-${Date.now().toString().slice(-6)}`;

        // Subir fotos de los tickets si hay
        const uploadedGastos = await Promise.all(gastos.map(async (g) => {
            if (g.comprobanteFile) {
                const fileRef = ref(storage, `comprobantes_gastos/${docId}/${g.comprobanteFile.name}`);
                await uploadBytes(fileRef, g.comprobanteFile);
                const url = await getDownloadURL(fileRef);
                return { ...g, comprobanteUrl: url, comprobanteFile: undefined };
            }
            return g;
        }));
        
        // Subir firma
        const firmaRef = ref(storage, `firmas_diarias/${docId}.png`);
        await uploadString(firmaRef, signature, 'data_url');
        const firmaUrl = await getDownloadURL(firmaRef);

        const parteData = {
            id: docId,
            inspectorId: user.uid,
            inspectorNombre: user.displayName || user.email,
            fecha: reportDate,
            ubicacionPrincipal: ubicacionPrincipal,
            lugarTrabajo,
            horas: horas,
            observaciones: observacionesDiarias,
            montoTotalGastos: totalGastos,
            gastos: uploadedGastos.map(({comprobanteFile, ...rest}) => rest), // Limpiamos el objeto File
            firmaUrl: firmaUrl,
            estado: 'Procesado',
            fechaCreacion: serverTimestamp(),
            formType: 'registro-jornada'
        };

        // Guardamos en una colección nueva "partes_diarios"
        const docRef = await addDoc(collection(db, "partes_diarios"), parteData);
        
        // Generamos el PDF con el ID final y lo subimos
        const pdfUrl = await generateAndUploadPDF({...parteData, id: docId}, docRef.id);

        await updateDoc(doc(db, "partes_diarios", docRef.id), { pdfUrl: pdfUrl });

        alert(`¡Jornada registrada con éxito! ID: ${docId}`);
        
        // Reset form
        setReportDate(new Date());
        setHoras({ normales: '', extrasTipo1: '', extrasTipo2: '' });
        setObservacionesDiarias('');
        setGastos([]);
        clearCanvas();
        setUbicacionPrincipal(null);
        setLocationStatus('idle');
        setLugarTrabajo('');

    } catch (e: any) {
        console.error("Error al guardar el parte diario: ", e);
        alert("Error al guardar: " + e.message);
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-slate-50 p-2 md:p-6">
      
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa del Parte Diario</DialogTitle>
             <DialogDescription>
              Revisa tus horas y gastos antes de enviar el registro definitivo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-200 p-4">
            {previewPdfUrl && (
              <iframe src={previewPdfUrl} className="w-full h-full shadow-md rounded-lg" title="PDF Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SECCIÓN 1: CABECERA Y FECHA */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><CalendarIcon size={20} /></div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Registro de Jornada</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className='p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center gap-3 font-bold text-slate-700 shadow-sm'>
                <User size={18} className="text-slate-400" /> Técnico: {user?.displayName || user?.email || 'Cargando...'}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full h-auto p-4 rounded-2xl flex items-center justify-start gap-3 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-slate-50 transition-all shadow-sm">
                    <CalendarIcon size={18} className="text-indigo-500" /> {format(reportDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl">
                <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus/>
              </PopoverContent>
            </Popover>
             <div className="md:col-span-2">
              <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'} 
                  className={`w-full bg-slate-50 border-2 rounded-xl p-3 flex items-center justify-center gap-3 font-bold shadow-sm text-sm transition-colors disabled:opacity-50 ${ubicacionPrincipal ? 'border-green-500 text-green-600' : 'border-slate-100 text-slate-700 hover:border-indigo-500'}`}
              >
                  {locationStatus === 'loading' && <Loader2 className="animate-spin text-indigo-500" size={16}/>}
                  {locationStatus !== 'loading' && (ubicacionPrincipal ? <CheckCircle2 size={16}/> : <MapPin size={16}/>)}
                  <span>{ubicacionPrincipal ? `UBICACIÓN DE INICIO: ${ubicacionPrincipal.lat.toFixed(4)}, ${ubicacionPrincipal.lon.toFixed(4)}` : 'INICIAR JORNADA (Capturar Ubicación)'}</span>
              </button>
            </div>
        </div>
      </section>

      {/* SECCIÓN 2: REGISTRO DE HORAS */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
         <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
            <Clock size={18} className="text-indigo-500"/> Horas Trabajadas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="space-y-1 w-full text-left md:col-span-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lugar de Trabajo</label>
                <Input type="text" value={lugarTrabajo} onChange={e => setLugarTrabajo(e.target.value)} placeholder="Ej: Oficina / Cliente X" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 shadow-sm" />
            </div>
            <div className="space-y-1 w-full text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas Normales</label>
                <Input type="number" min="0" step="0.5" value={horas.normales} onChange={e => handleHorasChange('normales', e.target.value)} placeholder="Ej: 8" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 shadow-sm" />
            </div>
            <div className="space-y-1 w-full text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Horas Extra (Tipo 1)</label>
                <Input type="number" min="0" step="0.5" value={horas.extrasTipo1} onChange={e => handleHorasChange('extrasTipo1', e.target.value)} placeholder="Ej: 2" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-bold text-slate-700 shadow-sm" />
            </div>
             <div className="space-y-1 w-full text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-rose-600">Horas Extras Especiales</label>
                <Input type="number" min="0" step="0.5" value={horas.extrasTipo2} onChange={e => handleHorasChange('extrasTipo2', e.target.value)} placeholder="Ej: Festivas" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-bold text-slate-700 shadow-sm" />
            </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones del día (Instalaciones visitadas, problemas, etc.)</label>
            <textarea 
                value={observacionesDiarias} 
                onChange={e => setObservacionesDiarias(e.target.value)} 
                placeholder="Añade comentarios sobre tu jornada aquí..." 
                className="w-full mt-2 h-24 bg-slate-50 border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-indigo-500 focus:bg-white font-medium text-slate-600 resize-none shadow-sm"
            />
        </div>
      </section>

      {/* SECCIÓN 3: GASTOS ASOCIADOS */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
                <Euro size={18} className="text-indigo-500"/> Gastos y Comprobantes
            </h3>
            {gastos.length > 0 && 
                <div className="font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg text-sm">
                    TOTAL: {totalGastos.toFixed(2)} €
                </div>
            }
        </div>
        
        {/* Formulario de Gasto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto (€)</label>
                <Input value={currentGasto.monto} onChange={e => setCurrentGasto({...currentGasto, monto: e.target.value})} type="number" placeholder="0.00" className="p-4 rounded-xl border-slate-200 focus:border-indigo-500 font-bold bg-white shadow-sm" />
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Gasto</label>
                <Select value={currentGasto.rubro} onValueChange={value => setCurrentGasto({...currentGasto, rubro: value})}>
                <SelectTrigger className="p-4 rounded-xl border-slate-200 focus:border-indigo-500 font-bold bg-white shadow-sm h-auto"><SelectValue/></SelectTrigger>
                <SelectContent className="rounded-xl">
                    {['Alimentación', 'Combustible', 'Peajes', 'Hospedaje', 'Repuestos', 'Otros'].map(r => <SelectItem key={r} value={r} className="font-medium">{r}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto / Descripción</label>
                <Input value={currentGasto.descripcion} onChange={e => setCurrentGasto({...currentGasto, descripcion: e.target.value})} type="text" placeholder="Ej: Comida en Restaurante El Paso" className="p-4 rounded-xl border-slate-200 focus:border-indigo-500 font-medium bg-white shadow-sm" />
            </div>
            
            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pago</label>
                <Select value={currentGasto.forma_pago} onValueChange={value => setCurrentGasto({...currentGasto, forma_pago: value})}>
                    <SelectTrigger className="p-4 rounded-xl border-slate-200 focus:border-indigo-500 font-bold bg-white shadow-sm h-auto"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="Tarjeta Empresa">Tarjeta Empresa</SelectItem>
                        <SelectItem value="Efectivo (Bolsillo)">Efectivo (Bolsillo propio)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-1 flex flex-col justify-end">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`p-4 h-auto rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all shadow-sm ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 hover:border-indigo-300 bg-white'}`}>
                    <Camera size={18}/> {currentGasto.comprobanteFile ? 'Ticket Adjuntado' : 'Subir Ticket / Foto'}
                </Button>
            </div>
            
            <Button onClick={handleAddGasto} className="p-4 h-auto rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2 md:col-span-2 hover:bg-indigo-700 shadow-md active:scale-95 transition-all">
                <Plus size={18}/> AÑADIR GASTO A LA JORNADA
            </Button>
        </div>
        
        {/* Lista de Gastos Agregados */}
        <div className="space-y-3 pt-2">
            {gastos.map((g, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm gap-4">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className={`p-3 rounded-full ${g.comprobanteUrl || g.comprobanteFile ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {g.comprobanteUrl || g.comprobanteFile ? <FileText size={20}/> : <AlertTriangle size={20}/>}
                        </div>
                        <div>
                            <p className="font-bold text-base text-slate-800">{g.descripcion}</p>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{g.rubro} • {g.forma_pago}</p>
                            {!(g.comprobanteUrl || g.comprobanteFile) && <p className="text-[10px] font-bold text-rose-500 mt-1">Falta ticket de comprobante</p>}
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                        <span className="font-black text-lg text-slate-900">{g.monto.toFixed(2)} €</span>
                        <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => i !== idx))} className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full h-10 w-10 transition-colors"><Trash2 size={20}/></Button>
                    </div>
                </div>
            ))}
            {gastos.length === 0 && <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-8">Ningún gasto registrado hoy</p>}
        </div>
      </section>

      {/* SECCIÓN 4: FIRMA DEL TÉCNICO */}
      <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><ClipboardSignature size={18} className="text-indigo-500"/> Validación del Técnico</h3>
        <p className="text-xs text-slate-500 font-medium">Declaro que las horas y gastos arriba indicados son correctos y corresponden a la jornada señalada.</p>
        <div className="space-y-2 pt-2">
            <canvas ref={signatureCanvasRef} width={600} height={200} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-crosshair touch-none" />
            <button onClick={clearCanvas} className="text-xs text-rose-500 font-bold hover:underline">Borrar Firma</button>
        </div>
      </section>

      {/* SECCIÓN 5: ACCIONES */}
      <div className="flex flex-col md:flex-row gap-4">
        <Button onClick={handlePreviewPDF} disabled={loading} variant="outline" className="w-full p-8 rounded-[2rem] font-black text-lg shadow-sm flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300">
            <FileSearch size={22} /> VISTA PREVIA
        </Button>
        <Button onClick={handleSaveParte} disabled={loading} className="w-full p-8 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800">
          {loading ? <Loader2 className="animate-spin text-indigo-400" /> : <Save className="text-indigo-400" />}
          {loading ? 'ENVIANDO REGISTRO...' : 'GUARDAR JORNADA'}
        </Button>
      </div>
    </div>
  );
}
