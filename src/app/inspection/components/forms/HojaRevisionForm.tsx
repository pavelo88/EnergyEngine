'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { CHECKLIST_SECTIONS, INITIAL_FORM_DATA } from '../../lib/form-constants';

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16}/>}
      <input 
        type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 ${Icon ? 'pl-11' : ''} outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm`}
      />
    </div>
  </div>
));

const LoadTestInput = React.memo(({ label, value, onChange }) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[9px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm text-center"
        />
    </div>
));

export default function HojaRevisionForm({ initialData }: { initialData?: any }) {
  const { user } = useUser();
  const db = useFirestore();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  
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
            else setInspectorName(user.email || 'Técnico');
        });
    }
  }, [user, db]);

  useEffect(() => {
    if (initialData) {
      // Deep merge initialData with formData
      setFormData(prev => ({
          ...prev,
          ...initialData,
          cliente: initialData.cliente || prev.cliente,
          equipo: initialData.equipo || prev.equipo,
          checklist: initialData.checklist || {},
          datos_pruebas: initialData.datos_pruebas || prev.datos_pruebas,
          pruebas_carga: initialData.pruebas_carga || prev.pruebas_carga,
      }));
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };
  
  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleChecklistChange = (item, status) => {
    setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item]: status } }));
  };

  const generatePDF = (isDraft = false) => {
    const doc = new jsPDF();
    const finalID = isDraft ? 'BORRADOR' : savedDocId;
    
    // Header
    doc.addImage('/logo.png', 'PNG', 15, 8, 40, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("ENERGY ENGINE", 205, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text("GRUPOS ELECTRÓGENOS", 205, 16, { align: 'right' });
    doc.text("www.energyengine.es", 205, 20, { align: 'right' });
    doc.text("administracion@energyengine.es", 205, 24, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(15, 30, 205, 30);
    
    // Main Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nº INSPECCION: ${finalID}`, 15, 36);

    // Client/Motor Data Table
    autoTable(doc, {
        startY: 40,
        body: [
            [{content: 'CLIENTE', styles: {fontStyle: 'bold'}}, formData.cliente, {content: 'FECHA REVISION:', styles: {fontStyle: 'bold'}}, formData.fecha_revision],
            [{content: 'MOTOR', styles: {fontStyle: 'bold'}}, formData.motor, {content: 'POTENCIA', styles: {fontStyle: 'bold'}}, formData.potencia],
            [{content: 'MODELO', styles: {fontStyle: 'bold'}}, formData.modelo, '', ''],
            [{content: 'Nº MOTOR', styles: {fontStyle: 'bold'}}, formData.n_motor, '', ''],
            [{content: 'Nº GRUPO', styles: {fontStyle: 'bold'}}, formData.n_grupo, '', ''],
            [{content: 'INSTALACION', styles: {fontStyle: 'bold'}}, formData.instalacion, '', ''],
            [{content: 'DIRECCION', styles: {fontStyle: 'bold'}}, formData.direccion, '', ''],
        ],
        theme: 'grid', styles: {fontSize: 8, cellPadding: 1}
    });

    let lastY = (doc as any).lastAutoTable.finalY + 2;

    // Checklist Table
    autoTable(doc, {
        startY: lastY,
        head: [['', 'OK', 'DEFECTUOSO', 'AVERIADO', 'CAMBIO']],
        body: Object.entries(CHECKLIST_SECTIONS).flatMap(([section, items]) => {
            const sectionRows: any[] = [[{ content: section, colSpan: 5, styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#000' }}]];
            (items as string[]).forEach(item => {
                sectionRows.push([
                    item,
                    formData.checklist[item] === 'OK' ? 'X' : '',
                    formData.checklist[item] === 'DEFECTUOSO' ? 'X' : '',
                    formData.checklist[item] === 'AVERIADO' ? 'X' : '',
                    formData.checklist[item] === 'CAMBIO' ? 'X' : '',
                ]);
            });
            return sectionRows;
        }),
        theme: 'grid', styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
        headStyles: { fillColor: '#334155', textColor: '#fff', halign: 'center' },
        columnStyles: { 0: { halign: 'left' } }
    });

    lastY = (doc as any).lastAutoTable.finalY + 5;
    
    // Test Data & Observations
    autoTable(doc, {
        startY: lastY,
        body: [
            [{ content: 'DATOS DE PRUEBAS', styles: { fontStyle: 'bold' }}, { content: 'VALORES', styles: { fontStyle: 'bold' }}],
            ['Horas de funcionamiento', formData.datos_pruebas.horas],
            ['Presión aceite', formData.datos_pruebas.presion],
            ['Temperatura en bloque motor', formData.datos_pruebas.temperatura],
            ['Nivel de deposito de combustible', formData.datos_pruebas.nivel_combustible],
            ['Tensión en el alternador', formData.datos_pruebas.tension_alternador],
            ['Frecuencia', formData.datos_pruebas.frecuencia],
            ['Carga de baterías', formData.datos_pruebas.carga_baterias],
            [{ content: 'PRUEBAS CON CARGA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' }}],
            [{ content: `Tensión: RS: ${formData.pruebas_carga.tension_rs} ST: ${formData.pruebas_carga.tension_st} RT: ${formData.pruebas_carga.tension_rt}`, colSpan: 2 }],
            [{ content: `Intensidad: R: ${formData.pruebas_carga.intensidad_r} S: ${formData.pruebas_carga.intensidad_s} T: ${formData.pruebas_carga.intensidad_t}`, colSpan: 2 }],
            [{ content: `Potencia: ${formData.pruebas_carga.potencia_kw} kW`, colSpan: 2 }],
            [{ content: 'OBSERVACIONES', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' }}],
            [{ content: formData.observaciones, colSpan: 2 }],
        ],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1 }
    });

    lastY = (doc as any).lastAutoTable.finalY;

    // Signature
    const signatureY = lastY + 10 > 250 ? 250 : lastY + 10;
    doc.setFontSize(9);
    if (inspectorSignature) doc.addImage(inspectorSignature, 'PNG', 140, signatureY, 50, 20);
    doc.line(140, signatureY + 20, 200, signatureY + 20);
    doc.text("Firma técnico:", 140, signatureY + 24);
    doc.text(inspectorName, 140, signatureY + 28);
    
    return doc;
  };
  
  const handlePdfAction = () => {
    const doc = generatePDF(isSaved ? false : true);
    if (isSaved) {
      doc.save(`Hoja_Revision_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user) return alert("Error de autenticación.");
    setSaving(true);
    const docId = `REV-${Date.now().toString().slice(-6)}`;
    try {
      const docData = { 
          ...formData, 
          inspectorSignatureUrl: inspectorSignature, 
          clientSignatureUrl: clientSignature, 
          tecnicoId: user.uid, 
          tecnicoNombre: inspectorName, 
          fecha_guardado: Timestamp.now(), 
          formType: 'hoja-revision',
          id: docId
      };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Hoja de Revisión guardada con éxito. ID: ${docId}`);
    } catch (e) { console.error("Error saving document:", e); alert("Error al guardar."); }
    finally { setSaving(false); }
  };
  
  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in">
        <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Vista Previa de Hoja de Revisión</DialogTitle>
                    <DialogDescription>Revisa el borrador. Este NO es el documento final.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-slate-200 p-4">
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
                </div>
            </DialogContent>
        </Dialog>

        <h2 className="text-2xl font-black text-black border-l-4 border-blue-500 pl-4 uppercase tracking-tighter">Hoja de Revisión (Uso Interno)</h2>

        {/* --- DATOS GENERALES --- */}
        <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
            <h3 className="font-bold text-slate-500">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StableInput label="Cliente" icon={Users} value={formData.cliente} onChange={v => handleInputChange('cliente', v)}/>
                <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={v => handleInputChange('instalacion', v)}/>
                <StableInput label="Dirección" icon={MapPin} value={formData.direccion} onChange={v => handleInputChange('direccion', v)}/>
                <StableInput label="Fecha Revisión" icon={Calendar} type="date" value={formData.fecha_revision} onChange={v => handleInputChange('fecha_revision', v)}/>
                <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={v => handleInputChange('motor', v)}/>
                <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={v => handleInputChange('modelo', v)}/>
                <StableInput label="Nº Motor" icon={Hash} value={formData.n_motor} onChange={v => handleInputChange('n_motor', v)}/>
                <StableInput label="Nº Grupo" icon={Hash} value={formData.n_grupo} onChange={v => handleInputChange('n_grupo', v)}/>
                <StableInput label="Potencia" icon={Zap} value={formData.potencia} onChange={v => handleInputChange('potencia', v)}/>
            </div>
        </section>
        
        {/* --- CHECKLISTS --- */}
        {Object.entries(CHECKLIST_SECTIONS).map(([section, items]) => (
            <section key={section} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <h3 className="font-bold text-slate-500">{section}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {(items as string[]).map(it => (
                    <div key={it} className={`p-3 rounded-xl flex justify-between items-center transition-all border ${formData.checklist[it] ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-xs font-bold text-slate-700">{it}</span>
                        <div className="flex gap-1">
                        {["OK", "DEFECTUOSO", "AVERIADO", "CAMBIO"].map(st => (
                            <button key={st} onClick={() => handleChecklistChange(it, st)} className={`w-12 h-8 rounded-lg text-[9px] font-black border-2 transition-all ${formData.checklist[it] === st ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>{st}</button>
                        ))}
                        </div>
                    </div>
                    ))}
                </div>
            </section>
        ))}

         {/* --- PRUEBAS --- */}
        <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
            <h3 className="font-bold text-slate-500">Datos de Pruebas y Carga</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <StableInput icon={Clock} label="Horas" value={formData.datos_pruebas.horas} onChange={v => handleNestedChange('datos_pruebas', 'horas', v)} />
                 <StableInput icon={Gauge} label="Presión Aceite" value={formData.datos_pruebas.presion} onChange={v => handleNestedChange('datos_pruebas', 'presion', v)} />
                 <StableInput icon={Thermometer} label="Temperatura" value={formData.datos_pruebas.temperatura} onChange={v => handleNestedChange('datos_pruebas', 'temperatura', v)} />
                 <StableInput icon={Droplets} label="Nivel Combustible" value={formData.datos_pruebas.nivel_combustible} onChange={v => handleNestedChange('datos_pruebas', 'nivel_combustible', v)} />
                 <StableInput icon={Zap} label="Tensión Alternador" value={formData.datos_pruebas.tension_alternador} onChange={v => handleNestedChange('datos_pruebas', 'tension_alternador', v)} />
                 <StableInput icon={Wind} label="Frecuencia" value={formData.datos_pruebas.frecuencia} onChange={v => handleNestedChange('datos_pruebas', 'frecuencia', v)} />
                 <StableInput icon={Battery} label="Carga Baterías" value={formData.datos_pruebas.carga_baterias} onChange={v => handleNestedChange('datos_pruebas', 'carga_baterias', v)} />
            </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4">
                <LoadTestInput label="Tensión RS" value={formData.pruebas_carga.tension_rs} onChange={v => handleNestedChange('pruebas_carga', 'tension_rs', v)} />
                <LoadTestInput label="Tensión ST" value={formData.pruebas_carga.tension_st} onChange={v => handleNestedChange('pruebas_carga', 'tension_st', v)} />
                <LoadTestInput label="Tensión RT" value={formData.pruebas_carga.tension_rt} onChange={v => handleNestedChange('pruebas_carga', 'tension_rt', v)} />
                <LoadTestInput label="Intensidad R" value={formData.pruebas_carga.intensidad_r} onChange={v => handleNestedChange('pruebas_carga', 'intensidad_r', v)} />
                <LoadTestInput label="Intensidad S" value={formData.pruebas_carga.intensidad_s} onChange={v => handleNestedChange('pruebas_carga', 'intensidad_s', v)} />
                <LoadTestInput label="Intensidad T" value={formData.pruebas_carga.intensidad_t} onChange={v => handleNestedChange('pruebas_carga', 'intensidad_t', v)} />
                <LoadTestInput label="Potencia kW" value={formData.pruebas_carga.potencia_kw} onChange={v => handleNestedChange('pruebas_carga', 'potencia_kw', v)} />
             </div>
        </section>

        {/* --- OBSERVACIONES Y FIRMAS --- */}
        <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
            <h3 className="font-bold text-slate-500">Observaciones</h3>
            <textarea className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-xl p-4" placeholder="Añade tus observaciones aquí..." value={formData.observaciones} onChange={e => handleInputChange('observaciones', e.target.value)}/>
            <div className="grid md:grid-cols-2 gap-8 items-start pt-6">
                 <div>
                    <SignaturePad title="Firma del Inspector" onSignatureEnd={setInspectorSignature} />
                    <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
                 </div>
                 <div>
                    <SignaturePad title="Firma del Cliente" onSignatureEnd={setClientSignature} />
                    <div className="mt-2">
                       <StableInput label="" icon={User} value={formData.recibidoPor} onChange={v => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
                    </div>
                 </div>
            </div>
        </section>

        {/* --- ACCIONES --- */}
        <div className="flex flex-col md:flex-row gap-4">
            <button onClick={handlePdfAction} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400">
                {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
                {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
            </button>
            <button onClick={handleSave} disabled={saving} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
                {saving ? <Loader2 className="animate-spin text-blue-500" /> : isSaved ? <CheckCircle2 className="text-blue-500" /> : <Save className="text-blue-500" />}
                {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR REVISIÓN'}
            </button>
        </div>
    </main>
  );
}
