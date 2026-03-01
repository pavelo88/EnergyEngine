'use client';
import React, { useState, useEffect } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Car, Euro, Zap, Thermometer, Battery, Droplets, Wind, Gauge } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';

// Memoized input component for performance
const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={16}/>}
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 ${Icon ? 'pl-11' : ''} outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm`}
      />
    </div>
  </div>
));

// New component for the load test inputs
const LoadTestInput = React.memo(({ label, value, onChange }) => (
    <div className="flex items-center gap-2">
        <input 
            type="text" 
            value={value || ''} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2 outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm text-center"
        />
        <label className="text-[10px] font-black text-slate-500 w-6 text-left">{label}</label>
    </div>
));


export default function AlbaranForm({ initialData }: { initialData?: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const inspectorName = user?.displayName || user?.email?.split('@')[0] || 'Técnico';
  
  const [formData, setFormData] = useState({
    cliente: '',
    instalacion: '',
    motor: '',
    n_motor: '',
    grupo: '',
    n_grupo: '',
    n_pedido: '',
    fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    tecnicos: inspectorName,
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

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        cliente: initialData.clienteNombre || prev.cliente,
        instalacion: initialData.cliente?.instalacion || prev.instalacion,
        motor: initialData.equipo?.modelo || prev.motor,
        n_motor: initialData.equipo?.sn || prev.n_motor,
        trabajos_realizados: initialData.descripcion || prev.trabajos_realizados,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({...prev, [field]: value }));
  };
  
  const handleNestedInputChange = (section: 'parametrosTecnicos' | 'potenciaConCarga', field: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        [section]: {
            ...(prev[section] as any),
            [field]: value
        }
    }));
  };

  const improveReport = async () => {
    if (!formData.trabajos_realizados) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData.trabajos_realizados });
      setFormData(p => ({
        ...p, 
        trabajos_realizados: res.improved,
        cliente: res.extra?.cliente || p.cliente,
        motor: res.extra?.modelo || p.motor,
        n_motor: res.extra?.sn || p.n_motor,
        grupo: res.extra?.n_grupo || p.grupo,
        recibidoPor: res.extra?.recibe || p.recibidoPor
      }));
    } catch(e) {
      console.error("AI enhancement failed:", e);
      alert("La IA tuvo problemas al refinar el informe.");
    } finally {
      setAiLoading(false);
    }
  };

  const generatePDF = (isDraft = false) => {
    const doc = new jsPDF();
    const finalID = isDraft ? 'BORRADOR' : savedDocId;
    
    // Header
    // Assuming logo is handled or skipped for now.
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text("ALBARÁN DE TRABAJO", 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Nº de albarán: ${finalID}`, 15, 30);

    // Client and Service Data using autotable for clean layout
    autoTable(doc, {
        startY: 40,
        body: [
            [{content: 'CLIENTE', styles: {fontStyle: 'bold'}}, formData.cliente, {content: 'FECHA', styles: {fontStyle: 'bold'}}, formData.fecha],
            [{content: 'INSTALACIÓN', styles: {fontStyle: 'bold'}}, formData.instalacion, {content: 'TÉCNICOS', styles: {fontStyle: 'bold'}}, formData.tecnicos],
            [{content: 'MOTOR', styles: {fontStyle: 'bold'}}, formData.motor, {content: 'H. ASISTENCIA', styles: {fontStyle: 'bold'}}, formData.h_asistencia],
            [{content: 'Nº MOTOR', styles: {fontStyle: 'bold'}}, formData.n_motor, {content: 'TIPO DE SERVICIO', styles: {fontStyle: 'bold'}}, formData.tipo_servicio],
            [{content: 'GRUPO', styles: {fontStyle: 'bold'}}, formData.grupo, {content: 'KMS.', styles: {fontStyle: 'bold'}}, formData.kms],
            [{content: 'Nº GRUPO', styles: {fontStyle: 'bold'}}, formData.n_grupo, {content: 'DIETA', styles: {fontStyle: 'bold'}}, `${formData.dieta} / ${formData.media_dieta ? `(1/2 Cant: ${formData.media_dieta_cantidad})`:''}`],
            [{content: 'Nº DE PEDIDO', styles: {fontStyle: 'bold'}}, formData.n_pedido, '', ''],
        ],
        theme: 'grid',
        styles: {fontSize: 9}
    });

    let finalYAfterHeader = (doc as any).lastAutoTable.finalY;

    // Parámetros Técnicos
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("PARÁMETROS TÉCNICOS", 15, finalYAfterHeader + 10);
    
    autoTable(doc, {
        startY: finalYAfterHeader + 12,
        body: [
            [`Horas: ${formData.parametrosTecnicos.horas}`, `Presión Aceite: ${formData.parametrosTecnicos.presionAceite}`, `Tensión: ${formData.parametrosTecnicos.tension}`],
            [`Tª (°C): ${formData.parametrosTecnicos.temperatura}`, `Nivel Combustible (%): ${formData.parametrosTecnicos.nivelCombustible}`, `Frecuencia (Hz): ${formData.parametrosTecnicos.frecuencia}`],
            [{content: `Tensión de baterías (V): ${formData.parametrosTecnicos.tensionBaterias}`, colSpan: 3, styles: {fontStyle: 'bold'}}],
        ],
        theme: 'grid',
        styles: {fontSize: 8},
        bodyStyles: { cellPadding: 2, minCellHeight: 10 },
        alternateRowStyles: {fillColor: false},
    });

    let finalYAfterParams = (doc as any).lastAutoTable.finalY;

    // Potencia con Carga
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Potencia con carga: ${formData.potenciaConCarga.potencia}`, 15, finalYAfterParams + 10);
    
    autoTable(doc, {
        startY: finalYAfterParams + 12,
        head: [['Tensión', 'Intensidad', 'Potencia (kW)']],
        body: [
            [`RS: ${formData.potenciaConCarga.tensionRS}`, `R: ${formData.potenciaConCarga.intensidadR}`, formData.potenciaConCarga.potenciaKW],
            [`ST: ${formData.potenciaConCarga.tensionST}`, `S: ${formData.potenciaConCarga.intensidadS}`, ''],
            [`RT: ${formData.potenciaConCarga.tensionRT}`, `T: ${formData.potenciaConCarga.intensidadT}`, ''],
        ],
        theme: 'grid',
        styles: {fontSize: 9, cellPadding: 2, minCellHeight: 10}
    });

    let finalYAfterLoad = (doc as any).lastAutoTable.finalY;

    // Trabajos Realizados
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TRABAJOS REALIZADOS", 15, finalYAfterLoad + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitText = doc.splitTextToSize(formData.trabajos_realizados, 180);
    const textBoxHeight = (splitText.length * 5) > 40 ? (splitText.length * 5) : 40; // Dynamic height
    doc.rect(15, finalYAfterLoad + 12, 180, textBoxHeight); // Text box
    doc.text(splitText, 17, finalYAfterLoad + 16);

    let finalY = finalYAfterLoad + 12 + textBoxHeight;

    // Signatures
    const signatureY = finalY > 230 ? 230 : finalY + 10;
    doc.setFontSize(10);
    
    doc.text("Conforme cliente:", 15, signatureY);
    if (clientSignature) doc.addImage(clientSignature, 'PNG', 15, signatureY + 2, 60, 25);
    doc.text(`Recibido por: ${formData.recibidoPor}`, 15, signatureY + 35);


    doc.text("Firma técnico:", 115, signatureY);
    if (inspectorSignature) doc.addImage(inspectorSignature, 'PNG', 115, signatureY + 2, 60, 25);
    doc.text(inspectorName, 115, signatureY + 35);
    
    doc.text("GRACIAS POR CONFIAR EN NOSOTROS", 105, 280, { align: 'center' });


    return doc;
  };

  const handlePdfAction = () => {
    if (!formData.cliente || !formData.instalacion) return alert("El cliente y la instalación son obligatorios.");
    const doc = isSaved ? generatePDF(false) : generatePDF(true);
    if (isSaved) {
      doc.save(`Albaran_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user) return alert("Error de autenticación.");
    if (!clientSignature || !inspectorSignature) return alert("Ambas firmas son obligatorias para guardar.");
    
    setSaving(true);
    const docId = `ALB-${Date.now().toString().slice(-6)}`;
    try {
      const docData = {
        ...formData,
        inspectorSignatureUrl: inspectorSignature, // Saving as Data URL
        clientSignatureUrl: clientSignature,
        tecnicoId: user.uid,
        tecnicoNombre: inspectorName,
        fecha_guardado: Timestamp.now(),
        id_albaran: docId,
        formType: 'albaran',
      };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Albarán guardado con éxito. ID: ${docId}`);
    } catch (e) {
      console.error("Error saving document:", e);
      alert("Error al guardar el albarán.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in">
        
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa del Albarán</DialogTitle>
             <DialogDescription>Revisa el borrador antes de guardarlo. Este NO es el documento final.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-200">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
      
      <h2 className="text-2xl font-black text-black border-l-4 border-amber-500 pl-4 uppercase tracking-tighter">Albarán de Trabajo</h2>
      
      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Columna Izquierda */}
            <div className="lg:col-span-2 space-y-3">
              <StableInput label="Cliente" icon={Users} value={formData.cliente} onChange={v => handleInputChange('cliente', v)}/>
              <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={v => handleInputChange('instalacion', v)}/>
              <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={v => handleInputChange('motor', v)}/>
              <StableInput label="Nº Motor" icon={Hash} value={formData.n_motor} onChange={v => handleInputChange('n_motor', v)}/>
              <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={v => handleInputChange('grupo', v)}/>
              <StableInput label="Nº Grupo" icon={Hash} value={formData.n_grupo} onChange={v => handleInputChange('n_grupo', v)}/>
              <StableInput label="Nº de Pedido" icon={Hash} value={formData.n_pedido} onChange={v => handleInputChange('n_pedido', v)}/>
            </div>
            {/* Columna Derecha */}
            <div className="lg:col-span-2 space-y-3">
               <StableInput label="Fecha" icon={Calendar} type="date" value={formData.fecha} onChange={v => handleInputChange('fecha', v)}/>
               <StableInput label="Técnicos" icon={User} value={formData.tecnicos} onChange={v => handleInputChange('tecnicos', v)}/>
               <StableInput label="H. Asistencia" icon={Clock} value={formData.h_asistencia} onChange={v => handleInputChange('h_asistencia', v)}/>
               <StableInput label="Tipo de Servicio" icon={Type} value={formData.tipo_servicio} onChange={v => handleInputChange('tipo_servicio', v)}/>
               <StableInput label="KMs" icon={Car} type="number" value={formData.kms} onChange={v => handleInputChange('kms', v)}/>
               <StableInput label="Dieta (€)" icon={Euro} type="number" value={formData.dieta} onChange={v => handleInputChange('dieta', v)}/>
               <div className="flex items-center gap-2 pt-2">
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={formData.media_dieta} onChange={e => handleInputChange('media_dieta', e.target.checked)} className="form-checkbox h-5 w-5 text-amber-600 rounded" />
                    1/2 Dieta
                 </label>
                 <StableInput label="Cantidad" type="number" value={formData.media_dieta_cantidad} onChange={v => handleInputChange('media_dieta_cantidad', v)}/>
               </div>
            </div>
         </div>
      </section>
      
      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Settings className="text-amber-500"/> Parámetros Técnicos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StableInput icon={Clock} label="Horas" value={formData.parametrosTecnicos.horas} onChange={v => handleNestedInputChange('parametrosTecnicos', 'horas', v)} />
              <StableInput icon={Gauge} label="Presión aceite" value={formData.parametrosTecnicos.presionAceite} onChange={v => handleNestedInputChange('parametrosTecnicos', 'presionAceite', v)} />
              <StableInput icon={Zap} label="Tensión" value={formData.parametrosTecnicos.tension} onChange={v => handleNestedInputChange('parametrosTecnicos', 'tension', v)} />
              <StableInput icon={Thermometer} label="Tª (°C)" value={formData.parametrosTecnicos.temperatura} onChange={v => handleNestedInputChange('parametrosTecnicos', 'temperatura', v)} />
              <StableInput icon={Droplets} label="Nivel combustible (%)" value={formData.parametrosTecnicos.nivelCombustible} onChange={v => handleNestedInputChange('parametrosTecnicos', 'nivelCombustible', v)} />
              <StableInput icon={Wind} label="Frecuencia (Hz)" value={formData.parametrosTecnicos.frecuencia} onChange={v => handleNestedInputChange('parametrosTecnicos', 'frecuencia', v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <StableInput icon={Battery} label="Tensión de baterías (V)" value={formData.parametrosTecnicos.tensionBaterias} onChange={v => handleNestedInputChange('parametrosTecnicos', 'tensionBaterias', v)} />
              </div>
          </div>
      </section>

      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Zap className="text-amber-500"/> Pruebas con Carga</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4">
              <StableInput label="Potencia con carga" value={formData.potenciaConCarga.potencia} onChange={v => handleNestedInputChange('potenciaConCarga', 'potencia', v)} />
            </div>
            <div className="md:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                <h4 className="col-span-full lg:col-span-1 text-sm font-bold text-slate-500">Tensión</h4>
                <div className="col-span-full lg:col-span-1 space-y-2">
                    <LoadTestInput label="RS" value={formData.potenciaConCarga.tensionRS} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionRS', v)} />
                    <LoadTestInput label="ST" value={formData.potenciaConCarga.tensionST} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionST', v)} />
                    <LoadTestInput label="RT" value={formData.potenciaConCarga.tensionRT} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionRT', v)} />
                </div>
                <h4 className="col-span-full lg:col-span-1 text-sm font-bold text-slate-500 pt-2 lg:pt-0">Intensidad</h4>
                 <div className="col-span-full lg:col-span-1 space-y-2">
                    <LoadTestInput label="R" value={formData.potenciaConCarga.intensidadR} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadR', v)} />
                    <LoadTestInput label="S" value={formData.potenciaConCarga.intensidadS} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadS', v)} />
                    <LoadTestInput label="T" value={formData.potenciaConCarga.intensidadT} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadT', v)} />
                </div>
                <h4 className="col-span-full lg:col-span-1 text-sm font-bold text-slate-500 pt-2 lg:pt-0">Potencia (kW)</h4>
                 <div className="col-span-full lg:col-span-1">
                     <LoadTestInput label="kW" value={formData.potenciaConCarga.potenciaKW} onChange={v => handleNestedInputChange('potenciaConCarga', 'potenciaKW', v)} />
                </div>
            </div>
        </div>
      </section>

      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Type className="text-amber-500"/> Trabajos Realizados</h2>
            <button onClick={improveReport} disabled={aiLoading} className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95">
                {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                Pulir con IA
            </button>
        </div>
        <textarea className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 outline-none focus:border-amber-500 focus:bg-white font-medium text-slate-600 shadow-inner resize-none leading-relaxed" placeholder="Describe los trabajos realizados..." value={formData.trabajos_realizados} onChange={e => handleInputChange('trabajos_realizados', e.target.value)}/>
     </section>

    <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900">Firmas</h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col items-center">
              <SignaturePad title="Firma del Inspector" onSignatureEnd={setInspectorSignature} />
              <p className="font-bold mt-2 text-slate-700">{inspectorName}</p>
            </div>
            <div className="flex flex-col">
              <SignaturePad title="Conforme Cliente" onSignatureEnd={setClientSignature} />
              <div className="mt-2">
                <StableInput label="" icon={User} value={formData.recibidoPor} onChange={v => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
              </div>
            </div>
        </div>
    </section>

    <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400">
            {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
            {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
          {saving ? <Loader2 className="animate-spin text-amber-500" /> : isSaved ? <CheckCircle2 className="text-amber-500" /> : <Save className="text-amber-500" />}
          {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR ALBARÁN'}
        </button>
    </div>
    </main>
  );
}
