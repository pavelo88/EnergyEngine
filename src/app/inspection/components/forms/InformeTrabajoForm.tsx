'use client';
import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Zap } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18}/>}
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 ${Icon ? 'pl-12' : ''} outline-none focus:border-green-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm`}
      />
    </div>
  </div>
));

export default function InformeTrabajoForm({ initialData }: { initialData?: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const inspectorName = user?.displayName || user?.email?.split('@')[0] || 'Técnico';
  
  const [formData, setFormData] = useState({
    cliente: { nombre: '', instalacion: '' },
    equipo: { marca: '', modelo: '', sn: '' },
    mediciones: { horas: '', presion: '', temp: '', combustible: '', tensionAlt: '', frecuencia: '', cargaBat: '' },
    pruebasCarga: { rs: '', st: '', rt: '', r: '', s: '', t: '', kw: '' },
    observaciones: '',
    recibidoPor: '',
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
        cliente: initialData.cliente || prev.cliente,
        equipo: initialData.equipo || prev.equipo,
        observaciones: initialData.observaciones || '',
        mediciones: initialData.mediciones || prev.mediciones,
        pruebasCarga: initialData.pruebasCarga || prev.pruebasCarga,
      }));
    }
  }, [initialData]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const improveReport = async () => {
    if (!formData.observaciones) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData.observaciones });
      setFormData(p => ({ ...p, observaciones: res.improved }));
    } catch (e) { console.error("AI enhancement failed:", e); }
    finally { setAiLoading(false); }
  };

  const generatePDF = (isDraft = false) => {
    const doc = new jsPDF();
    doc.text(`INFORME DE TRABAJO - ${isDraft ? 'BORRADOR' : savedDocId}`, 10, 10);
    // ... (rest of PDF generation logic for this form type)
    autoTable(doc, {
        startY: 20,
        head: [['DATOS', 'INFO']],
        body: [
            ['CLIENTE', formData.cliente.nombre],
            ['EQUIPO', `${formData.equipo.marca} ${formData.equipo.modelo}`],
            ['HORAS MOTOR', formData.mediciones.horas],
        ],
    });
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 5,
        head: [['OBSERVACIONES']],
        body: [[formData.observaciones]],
    });
    return doc;
  };

  const handlePdfAction = () => {
    const doc = generatePDF(isSaved ? false : true);
    if (isSaved) {
      doc.save(`Informe_Trabajo_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user || !clientSignature || !inspectorSignature) return alert("Faltan datos o firmas.");
    setSaving(true);
    const docId = `INF-${Date.now().toString().slice(-6)}`;
    try {
      const docData = { ...formData, inspectorSignature, clientSignature, tecnicoId: user.uid, fecha: Timestamp.now(), formType: 'informe-trabajo' };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Informe guardado. ID: ${docId}`);
    } catch (e) { console.error("Error saving document:", e); }
    finally { setSaving(false); }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10 animate-in fade-in">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
          <DialogContent className="max-w-4xl h-[90vh]"><iframe src={previewPdfUrl!} className="w-full h-full" /></DialogContent>
      </Dialog>
      <h2 className="text-2xl font-black text-black border-l-4 border-green-500 pl-4 uppercase tracking-tighter">Informe de Trabajo</h2>
      
      <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-8 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StableInput label="Cliente" icon={Users} value={formData.cliente.nombre} onChange={v => handleInputChange('cliente', 'nombre', v)}/>
            <StableInput label="Instalación" icon={MapPin} value={formData.cliente.instalacion} onChange={v => handleInputChange('cliente', 'instalacion', v)}/>
            <StableInput label="Marca Equipo" icon={Settings} value={formData.equipo.marca} onChange={v => handleInputChange('equipo', 'marca', v)}/>
            <StableInput label="Modelo Equipo" icon={Settings} value={formData.equipo.modelo} onChange={v => handleInputChange('equipo', 'modelo', v)}/>
          </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 text-left">
        <h2 className="text-xl font-black flex items-center gap-3 text-green-600 uppercase tracking-tighter"><Zap size={20}/> Mediciones y Pruebas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {Object.entries(formData.mediciones).map(([key, value]) => <StableInput key={key} label={key.replace(/([A-Z])/g, ' $1').toUpperCase()} value={value} onChange={v => handleInputChange('mediciones', key, v)}/>)}
            {Object.entries(formData.pruebasCarga).map(([key, value]) => <StableInput key={key} label={`CARGA ${key.toUpperCase()}`} value={value} onChange={v => handleInputChange('pruebasCarga', key, v)}/>)}
        </div>
      </section>

       <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-6 border border-slate-100">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Type className="text-green-500"/> Observaciones</h2>
            <button onClick={improveReport} disabled={aiLoading} className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100">
                {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />} Pulir con IA
            </button>
        </div>
        <textarea className="w-full h-48 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8" placeholder="Describe los trabajos..." value={formData.observaciones} onChange={e => setFormData(p => ({...p, observaciones: e.target.value}))}/>
     </section>
      
    <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900">Firmas</h2>
        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <SignaturePad title="Firma del Inspector" onSignatureEnd={setInspectorSignature} />
                <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
            </div>
            <div>
                <SignaturePad title="Conforme Cliente" onSignatureEnd={setClientSignature} />
                <div className="mt-2">
                    <StableInput label="" icon={User} value={formData.recibidoPor} onChange={v => setFormData(p => ({...p, recibidoPor: v}))} placeholder="Nombre del receptor"/>
                </div>
            </div>
        </div>
    </section>
      
      <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} className="w-full p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-[2.5rem] font-bold text-lg flex items-center justify-center gap-4">
            {isSaved ? <Printer/> : <FileSearch/>} {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin"/> : isSaved ? <CheckCircle2/> : <Save/>} {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR INFORME'}
        </button>
      </div>
    </main>
  );
}
