'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { CHECKLIST_SECTIONS } from '../../lib/form-constants';

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18}/>}
      <input 
        type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 ${Icon ? 'pl-12' : ''} outline-none focus:border-purple-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm`}
      />
    </div>
  </div>
));

const motorItems = CHECKLIST_SECTIONS["INSPECCION EN EL MOTOR"];

export default function RevisionBasicaForm({ initialData }: { initialData?: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState({
    cliente: { nombre: '', instalacion: '' },
    equipo: { marca: '', modelo: '', sn: '' },
    checklist: {},
    observaciones: '',
    recibidoPor: '',
  });
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

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
        cliente: initialData.cliente || prev.cliente,
        equipo: initialData.equipo || prev.equipo,
        checklist: initialData.checklist || {},
      }));
    }
  }, [initialData]);

  const handleChecklistChange = (item, status) => {
    setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item]: status } }));
  };

  const generatePDF = (isDraft = false) => {
    const doc = new jsPDF();
    doc.text(`REVISIÓN BÁSICA - ${isDraft ? 'BORRADOR' : savedDocId}`, 10, 10);
    autoTable(doc, {
        startY: 20,
        head: [['Ítem de Motor', 'Estado']],
        body: motorItems.map(item => [item, formData.checklist[item] || 'N/A'])
    });
    return doc;
  };
  
  const handlePdfAction = () => {
    const doc = generatePDF(isSaved ? false : true);
    if (isSaved) {
      doc.save(`Revision_Basica_${savedDocId}.pdf`);
    }
    else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user || !clientSignature || !inspectorSignature) return alert("Faltan datos o firmas.");
    setSaving(true);
    const docId = `BAS-${Date.now().toString().slice(-6)}`;
    try {
      const docData = { ...formData, inspectorSignature, clientSignature, tecnicoId: user.uid, tecnicoNombre: inspectorName, fecha: Timestamp.now(), formType: 'revision-basica' };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Revisión guardada. ID: ${docId}`);
    } catch (e) { console.error("Error saving document:", e); }
    finally { setSaving(false); }
  };
  
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-10 animate-in fade-in">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
          <DialogContent className="max-w-4xl h-[90vh]"><iframe src={previewPdfUrl!} className="w-full h-full" /></DialogContent>
      </Dialog>
      <h2 className="text-2xl font-black text-black border-l-4 border-purple-500 pl-4 uppercase tracking-tighter">Revisión Básica de Motor</h2>

      <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-6 border border-slate-100">
        <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] opacity-30">INSPECCIÓN EN EL MOTOR</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {motorItems.map(it => (
            <div key={it} className={`p-4 rounded-2xl flex justify-between items-center transition-all border-2 ${formData.checklist[it] ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-transparent'}`}>
              <span className="text-[12px] font-bold text-slate-700">{it}</span>
              <div className="flex gap-1">
                {["OK", "DEF", "AVR", "CMB"].map(st => (
                  <button key={st} onClick={() => handleChecklistChange(it, st)} className={`w-10 h-8 rounded-lg text-[8px] font-black border-2 ${formData.checklist[it] === st ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>{st}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
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
          {saving ? <Loader2 className="animate-spin"/> : isSaved ? <CheckCircle2/> : <Save/>} {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR REVISIÓN'}
        </button>
      </div>
    </main>
  );
}
