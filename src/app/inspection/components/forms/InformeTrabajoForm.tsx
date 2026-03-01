'use client';
import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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

const LabeledTextarea = React.memo(({ label, value, onChange, onEnhance, aiLoading }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
                <Type size={18} className="text-green-500" /> {label}
            </h3>
            <button onClick={onEnhance} disabled={aiLoading} className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors active:scale-95">
                {aiLoading ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                Pulir con IA
            </button>
        </div>
        <textarea 
            className="w-full h-40 bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 outline-none focus:border-green-500 focus:bg-white font-medium text-slate-600 shadow-inner resize-y leading-relaxed" 
            placeholder={`Detalles sobre ${label.toLowerCase()}...`}
            value={value} 
            onChange={e => onChange(e.target.value)}
        />
    </div>
));


export default function InformeTecnicoForm({ initialData }: { initialData?: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState({
    motor: '',
    modelo: '',
    n_motor: '',
    grupo: '',
    instalacion: '',
    fecha: new Date().toISOString().split('T')[0],
    antecedentes: '',
    intervencion: '',
    resumen: '',
  });
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.email && db) {
        getDoc(doc(db, 'usuarios', user.email)).then(snap => {
            if (snap.exists()) setInspectorName(snap.data().nombre);
        });
    }
  }, [user, db]);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        motor: initialData.motor || initialData.equipo?.marca || prev.motor,
        modelo: initialData.modelo || initialData.equipo?.modelo || prev.modelo,
        n_motor: initialData.n_motor || initialData.equipo?.sn || prev.n_motor,
        grupo: initialData.grupo || prev.grupo,
        instalacion: initialData.instalacion || initialData.cliente?.nombre || prev.instalacion,
        antecedentes: initialData.antecedentes || prev.antecedentes,
        intervencion: initialData.intervencion || prev.intervencion,
        resumen: initialData.resumen || initialData.observaciones || prev.resumen,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const enhanceSection = async (section: 'antecedentes' | 'intervencion' | 'resumen') => {
    if (!formData[section]) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData[section] });
      setFormData(p => ({ ...p, [section]: res.improved }));
    } catch (e) { console.error("AI enhancement failed:", e); }
    finally { setAiLoading(false); }
  };

  const generatePDF = (isDraft = false) => {
    const doc = new jsPDF();
    const finalID = isDraft ? 'BORRADOR' : savedDocId;
    const darkColor = '#0f172a';
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("INFORME TÉCNICO", 105, 20, { align: 'center' });
    
    let startY = 35;
    const headerData = [
        ['Motor:', formData.motor],
        ['Modelo:', formData.modelo],
        ['Nº de motor:', formData.n_motor],
        ['Grupo:', formData.grupo],
        ['Instalación:', formData.instalacion],
    ];

    headerData.forEach(row => {
        doc.setFont('helvetica', 'bold');
        doc.text(row[0], 15, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(row[1], 50, startY);
        startY += 7;
    });

    const addSection = (title, content) => {
        startY += 10;
        if (startY > 260) {
            doc.addPage();
            startY = 20;
        }
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 15, startY);
        startY += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(content || 'Sin datos.', 180);
        doc.text(splitText, 15, startY);
        startY += (splitText.length * 5);
    };

    addSection('Descripción de la incidencia', ''); // Title holder
    addSection('ANTECEDENTES:', formData.antecedentes);
    addSection('INTERVENCIÓN:', formData.intervencion);
    addSection('RESUMEN Y SITUACIÓN ACTUAL:', formData.resumen);

    // Signature
    const signatureY = doc.internal.pageSize.height - 40;
    if(inspectorSignature) {
        doc.addImage(inspectorSignature, 'PNG', 15, signatureY - 15, 60, 25);
    }
    doc.setFontSize(10);
    doc.text(`Firmado: ${inspectorName}`, 15, signatureY + 20);
    doc.text(`A ${new Date(formData.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, 15, signatureY + 27);


    // Footer
    const pageCount = doc.internal.pages.length;
     for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 190, doc.internal.pageSize.height - 10);
    }

    return doc;
  };

  const handlePdfAction = () => {
    const doc = generatePDF(isSaved ? false : true);
    if (isSaved) {
      doc.save(`Informe_Tecnico_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user || !inspectorSignature) return alert("La firma del inspector es obligatoria.");
    setSaving(true);
    const docId = `INF-TEC-${Date.now().toString().slice(-6)}`;
    try {
      const docData = { 
        ...formData, 
        inspectorSignatureUrl: inspectorSignature, 
        tecnicoId: user.uid, 
        tecnicoNombre: inspectorName,
        fecha_guardado: Timestamp.now(), 
        formType: 'informe-tecnico',
        id_informe: docId
      };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Informe Técnico guardado. ID: ${docId}`);
    } catch (e) { console.error("Error saving document:", e); }
    finally { setSaving(false); }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in bg-slate-50 min-h-screen">
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

      <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 border-l-4 border-green-500 pl-4 uppercase tracking-tighter">Informe Técnico</h2>
      </header>
      
      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
         <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] opacity-30">Datos de Identificación</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={v => handleInputChange('motor', v)}/>
            <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={v => handleInputChange('modelo', v)}/>
            <StableInput label="Nº de motor" icon={Type} value={formData.n_motor} onChange={v => handleInputChange('n_motor', v)}/>
            <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={v => handleInputChange('grupo', v)}/>
            <div className="md:col-span-2">
                <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={v => handleInputChange('instalacion', v)}/>
            </div>
          </div>
      </section>

      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-8 border border-slate-100">
         <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] opacity-30">Detalles de la Incidencia</h3>
        <LabeledTextarea label="Antecedentes" value={formData.antecedentes} onChange={(v) => handleInputChange('antecedentes', v)} onEnhance={() => enhanceSection('antecedentes')} aiLoading={aiLoading}/>
        <LabeledTextarea label="Intervención" value={formData.intervencion} onChange={(v) => handleInputChange('intervencion', v)} onEnhance={() => enhanceSection('intervencion')} aiLoading={aiLoading}/>
        <LabeledTextarea label="Resumen y Situación Actual" value={formData.resumen} onChange={(v) => handleInputChange('resumen', v)} onEnhance={() => enhanceSection('resumen')} aiLoading={aiLoading}/>
      </section>
      
      <section className="bg-white p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] opacity-30">Validación</h2>
        <div>
            <SignaturePad title="Firma del Inspector" onSignatureEnd={setInspectorSignature} />
            <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
        </div>
      </section>
      
      <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} className="w-full p-8 bg-white text-slate-900 border-2 border-slate-200 rounded-[2.5rem] font-bold text-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
            {isSaved ? <Printer/> : <FileSearch/>} {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
          {saving ? <Loader2 className="animate-spin text-green-500"/> : isSaved ? <CheckCircle2 className="text-green-500"/> : <Save className="text-green-500"/>} {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR INFORME'}
        </button>
      </div>
    </main>
  );
}
