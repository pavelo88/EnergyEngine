
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Receipt, MapPin, Save, Loader2, User, Hourglass, Euro, Trash2, Plus, 
  PenTool, FileText, CheckCircle, ClipboardSignature, Upload, Camera, Calendar as CalendarIcon, Briefcase, FileSearch
} from 'lucide-react';
import { db, auth, storage } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
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


// --- TIPOS DE DATOS ---
type Intervencion = {
  descripcion: string;
  horas: number;
};
type Gasto = {
  rubro: string;
  monto: number;
  descripcion:string;
  forma_pago: string;
  comprobanteUrl?: string;
  comprobanteFile?: File;
};

const initialGastoState = { rubro: 'Alimentación', monto: '', descripcion: '', forma_pago: 'Efectivo', comprobanteFile: undefined };
const initialIntervencionState = { descripcion: '', horas: '' };

// --- COMPONENTE PRINCIPAL ---
export default function ExpensesTab() {
  const [user, setUser] = useState(auth.currentUser);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  
  const [interventions, setInterventions] = useState<Intervencion[]>([]);
  const [currentIntervention, setCurrentIntervention] = useState(initialIntervencionState);
  
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

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

  // --- LÓGICA DEL FORMULARIO ---
  const handleAddIntervention = () => {
    if (!currentIntervention.descripcion || !currentIntervention.horas) {
      return alert("La descripción y las horas son obligatorias.");
    }
    setInterventions([...interventions, { ...currentIntervention, horas: parseFloat(currentIntervention.horas) }]);
    setCurrentIntervention(initialIntervencionState);
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
      setCurrentGasto(prev => ({ ...prev, comprobanteFile: e.target.files[0] }));
    }
  };

  const totalHoras = useMemo(() => interventions.reduce((acc, curr) => acc + curr.horas, 0), [interventions]);
  const totalGastos = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);

  // --- LÓGICA DE PDF ---
  const createParteDiarioPDF = (data: any) => {
    const doc = new jsPDF();
    const primaryColor = '#F59E0B'; // Amber-500
    const darkColor = '#0F172A'; // Slate-900

    // Header
    doc.setFillColor(darkColor);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor('#FFFFFF');
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("PARTE DE TRABAJO DIARIO", 15, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Inspector: ${data.email_inspector || 'No especificado'}`, 130, 12);
    doc.text(`Fecha: ${format(data.fecha, 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}`, 130, 19);

    let currentY = 40;

    // Summary Cards
    doc.setFillColor('#F1F5F9'); // Slate-100
    doc.roundedRect(15, currentY, 88, 20, 3, 3, 'F');
    doc.roundedRect(107, currentY, 88, 20, 3, 3, 'F');
    
    doc.setTextColor(darkColor);
    doc.setFontSize(10);
    doc.text('HORAS TOTALES REPORTADAS', 20, currentY + 7);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.total_horas.toFixed(2)} h`, 20, currentY + 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('GASTOS TOTALES DEL DÍA', 112, currentY + 7);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.total_gastos.toFixed(2)} €`, 112, currentY + 15);

    currentY += 30;

    // Interventions Table
    if (data.intervenciones.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Intervenciones Realizadas", 15, currentY);
      currentY += 7;
      autoTable(doc, {
        startY: currentY,
        head: [['Descripción de la Tarea', 'Horas Dedicadas']],
        body: data.intervenciones.map((i: any) => [i.descripcion, i.horas.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: darkColor },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Expenses Table
    if (data.gastos.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text("Gastos y Viáticos", 15, currentY);
      currentY += 7;
      autoTable(doc, {
        startY: currentY,
        head: [['Rubro', 'Descripción', 'Forma Pago', 'Comprobante', 'Monto (€)']],
        body: data.gastos.map((g: any) => [g.rubro, g.descripcion, g.forma_pago, g.comprobanteUrl || g.comprobanteFile ? 'Sí' : 'No', g.monto.toFixed(2)]),
        theme: 'grid',
        headStyles: { fillColor: darkColor },
        didParseCell: function (data: any) {
          if (data.column.dataKey === 4) { // Monto column
            data.cell.styles.halign = 'right';
          }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY;
    }

    // Signature
    const signatureY = doc.internal.pageSize.height - 50;
    doc.setLineWidth(0.5);
    doc.setDrawColor(darkColor);
    doc.line(15, signatureY + 25, 85, signatureY + 25);
    doc.setFontSize(10);
    doc.text("Firma del Inspector", 40, signatureY + 30);
    if(data.firma_inspector_url) {
      doc.addImage(data.firma_inspector_url, 'PNG', 20, signatureY, 60, 25);
    }
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor('#94A3B8'); // Slate-400
        doc.text(`Energy Engine © ${new Date().getFullYear()}`, 15, 290);
        doc.text(`Página ${i} de ${pageCount}`, 180, 290);
    }

    return doc;
  }

  const handlePreviewPDF = () => {
    if (!user) return alert("Error de autenticación. Por favor, recarga la página.");
    
    const parteDataForPreview = {
        email_inspector: user.email,
        fecha: reportDate,
        total_horas: totalHoras,
        intervenciones: interventions,
        gastos: gastos,
        total_gastos: totalGastos,
        firma_inspector_url: signature,
    };
    const doc = createParteDiarioPDF(parteDataForPreview);
    const pdfDataUri = doc.output('datauristring');
    setPreviewPdfUrl(pdfDataUri);
  }

  const generateAndUploadPDF = async (data: any, docId: string) => {
    const doc = createParteDiarioPDF(data);
    const pdfDataUri = doc.output('datauristring');
    const storageRef = ref(storage, `partes_diarios/${docId}.pdf`);
    await uploadString(storageRef, pdfDataUri, 'data_url');
    return getDownloadURL(storageRef);
  };

  const handleSaveParte = async () => {
    if (!user) return alert("Error de autenticación. Por favor, recarga la página.");
    if (interventions.length === 0 && gastos.length === 0) return alert("Debes añadir al menos una intervención o un gasto.");
    if (!signature) return alert("La firma del inspector es obligatoria.");

    setLoading(true);
    try {
        const docId = `${format(reportDate, 'yyyy-MM-dd')}_${user.uid}`;

        // 1. Subir todas las imágenes de gastos y la firma
        const uploadedGastos = await Promise.all(gastos.map(async (g) => {
            if (g.comprobanteFile) {
                const fileRef = ref(storage, `comprobantes/${docId}/${g.comprobanteFile.name}`);
                await uploadBytes(fileRef, g.comprobanteFile);
                const url = await getDownloadURL(fileRef);
                return { ...g, comprobanteUrl: url, comprobanteFile: undefined };
            }
            return g;
        }));
        
        const firmaRef = ref(storage, `firmas_partes/${docId}.png`);
        await uploadString(firmaRef, signature, 'data_url');
        const firmaUrl = await getDownloadURL(firmaRef);

        // 2. Preparar el objeto de datos para Firestore
        const parteData = {
            id_inspector: user.uid,
            email_inspector: user.email,
            fecha: reportDate,
            total_horas: totalHoras,
            total_gastos: totalGastos,
            intervenciones: interventions,
            gastos: uploadedGastos.map(({comprobanteFile, ...rest}) => rest), // No guardar el File object
            firma_inspector_url: firmaUrl,
            estado: 'Pendiente Aprobación'
        };

        // 3. Guardar en Firestore
        const docRef = await addDoc(collection(db, "partes_diarios"), parteData);
        
        // 4. Generar y subir el PDF
        const pdfUrl = await generateAndUploadPDF({...parteData, fecha: new Date(parteData.fecha)}, docRef.id);

        // 5. Actualizar el documento con la URL del PDF
        await updateDoc(doc(db, "partes_diarios", docRef.id), { pdf_url: pdfUrl });

        alert("¡Parte de Trabajo guardado y PDF generado con éxito!");
        
        // 6. Reset full form
        setReportDate(new Date());
        setInterventions([]);
        setGastos([]);
        clearCanvas();

    } catch (e: any) {
        console.error("Error al guardar el parte: ", e);
        alert("Error al guardar: " + e.message);
    } finally {
        setLoading(false);
    }
  };


  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
      
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa del Parte Diario</DialogTitle>
             <DialogDescription>
              Revisa el borrador de tu parte diario antes de guardarlo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1">
            {previewPdfUrl && (
              <iframe src={previewPdfUrl} className="w-full h-full" title="PDF Preview" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* SECCIÓN 1: CABECERA DEL PARTE */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><FileText size={20} /></div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Parte de Trabajo Diario</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className='p-4 rounded-2xl bg-slate-50 flex items-center gap-2 font-bold text-sm text-slate-500'>
                <User size={16} /> Inspector: {user?.email || 'Cargando...'}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full p-4 rounded-2xl flex items-center justify-start gap-2 font-bold text-sm bg-slate-50 border-none h-auto">
                    <CalendarIcon size={16} /> {format(reportDate, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus/>
              </PopoverContent>
            </Popover>
        </div>
      </section>

      {/* SECCIÓN 2: INTERVENCIONES Y HORAS */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Briefcase size={18} className="text-blue-500"/> Intervenciones del Día</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px] gap-2 bg-slate-50 p-4 rounded-2xl">
            <input value={currentIntervention.descripcion} onChange={e => setCurrentIntervention({...currentIntervention, descripcion: e.target.value})} type="text" placeholder="Descripción de la intervención" className="p-3 rounded-lg border-none font-bold md:col-span-1 col-span-3" />
            <input value={currentIntervention.horas} onChange={e => setCurrentIntervention({...currentIntervention, horas: e.target.value})} type="number" placeholder="Horas" className="p-3 rounded-lg border-none font-bold md:col-span-1 col-span-2" />
            <button onClick={handleAddIntervention} className="p-3 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center gap-2 md:col-span-1 col-span-1"><Plus size={16}/></button>
        </div>
        <div className="space-y-2">
            {interventions.map((int, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <p className="font-bold text-sm text-slate-800">{int.descripcion}</p>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{int.horas.toFixed(2)} h</span>
                        <button onClick={() => setInterventions(interventions.filter((_, idx) => i !== idx))} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {interventions.length > 0 && 
                <div className="text-right font-black text-blue-600 bg-blue-50 p-3 rounded-lg">
                    TOTAL HORAS: {totalHoras.toFixed(2)} h
                </div>
            }
        </div>
      </section>

      {/* SECCIÓN 3: GASTOS ASOCIADOS --- */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Receipt size={18} className="text-blue-500"/> Gastos y Viáticos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
            <input value={currentGasto.monto} onChange={e => setCurrentGasto({...currentGasto, monto: e.target.value})} type="number" placeholder="Monto (€)" className="p-3 rounded-lg border-none font-bold" />
            <select value={currentGasto.rubro} onChange={e => setCurrentGasto({...currentGasto, rubro: e.target.value})} className="p-3 rounded-lg border-none font-bold">
                {['Alimentación', 'Combustible', 'Peajes', 'Hospedaje', 'Repuestos', 'Otros'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={currentGasto.descripcion} onChange={e => setCurrentGasto({...currentGasto, descripcion: e.target.value})} type="text" placeholder="Descripción del gasto" className="p-3 rounded-lg border-none font-bold col-span-full" />
            <select value={currentGasto.forma_pago} onChange={e => setCurrentGasto({...currentGasto, forma_pago: e.target.value})} className="p-3 rounded-lg border-none font-bold">
                <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
            </select>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-lg font-bold flex items-center justify-center gap-2 ${currentGasto.comprobanteFile ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                <Camera size={16}/> {currentGasto.comprobanteFile ? 'Foto OK' : 'Comprobante'}
            </button>
            <button onClick={handleAddGasto} className="p-3 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center gap-2 col-span-full"><Plus size={16}/>Añadir Gasto</button>
        </div>
        <div className="space-y-2">
            {gastos.map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        {g.comprobanteUrl || g.comprobanteFile ? <Camera size={16} className="text-blue-500"/> : <Euro size={16} className="text-emerald-500"/>}
                        <div>
                            <p className="font-bold text-sm text-slate-800">{g.descripcion}</p>
                            <p className="text-xs text-slate-500">{g.rubro} - {g.forma_pago}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{g.monto.toFixed(2)}€</span>
                        <button onClick={() => setGastos(gastos.filter((_, idx) => i !== idx))} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                    </div>
                </div>
            ))}
            {gastos.length === 0 && <p className="text-center text-xs text-slate-400 font-bold py-4">No hay gastos añadidos a este parte.</p>}
        </div>
      </section>

      {/* SECCIÓN 4: FIRMA DEL TÉCNICO */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
        <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><ClipboardSignature size={18} className="text-blue-500"/> Firma de Conformidad</h3>
        <div className="space-y-2">
            <canvas ref={signatureCanvasRef} width={600} height={200} className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-crosshair touch-none" />
            <button onClick={clearCanvas} className="text-xs text-red-500 font-bold">Limpiar Firma</button>
        </div>
      </section>

      {/* ACCIÓN FINAL */}
      <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePreviewPDF} disabled={loading} className="w-full p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-[2.5rem] font-bold text-lg shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50">
            <FileSearch size={22} />
            VISTA PREVIA
        </button>
        <button onClick={handleSaveParte} disabled={loading} className="w-full p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin text-blue-500" /> : <Upload className="text-blue-500" />}
          {loading ? 'GUARDANDO Y SINCRONIZANDO...' : 'FINALIZAR Y SUBIR PARTE'}
        </button>
      </div>
    </div>
  );
}
