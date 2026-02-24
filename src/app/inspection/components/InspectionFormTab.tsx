
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Mic, StopCircle, Type, MapPin, Save, Printer, FileText, Settings, Users, 
  LogOut, CheckCircle2, ShieldCheck, BrainCircuit, X, Zap, Mail, Wand2, RefreshCcw
} from 'lucide-react';

import { db, auth } from '../../../lib/firebase';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import { processDictation } from '@/ai/flows/process-dictation-flow';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'energy-engine-enterprise';

const EnergyLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12V22L22 10H13V2Z" fill="#10b981" />
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#064e3b" strokeWidth="1" strokeDasharray="3 3"/>
  </svg>
);

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder }) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18}/>}
      <input 
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 ${Icon ? 'pl-12' : ''} outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm`}
      />
    </div>
  </div>
));

const CHECKLIST_SECTIONS = {
  "INSPECCION EN EL MOTOR": ["Nivel de lubricante", "Indicador nivel refrigerante", "Correa del ventilador", "Filtro de combustible y prefiltro", "Filtro de aire", "Filtro de aceite y prefiltro de aceite", "Tubo de escape", "Circuito de refrigeración", "Circuito de lubricación", "Baterías", "Motor de arranque"],
  "INSPECCION EN EL ALTERNADOR": ["Placas de los bornes", "Regulador eléctrico", "Colector", "Rodamiento", "Ventilación", "Escobillas", "Maniobra"],
  "INSPECCION EQUIPO ELECTRICO": ["Aparatos de medida", "Pilotos", "Mantenedor de baterías", "Interruptor general", "Resistencia de caldeo", "Contactores", "Reles auxiliares", "Apriete bornes", "Cableado"],
  "RECAMBIOS": ["Filtro de combustible", "Filtro de aceite", "Filtro de aire", "Correa motor", "Aceite", "Anticongelante"]
};

const ALL_CHECKLIST_ITEMS = Object.values(CHECKLIST_SECTIONS).flat();

export default function App({ task }: { task?: any }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [inspectorName, setInspectorName] = useState('Antonio Ugena');
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [reportBaseID, setReportBaseID] = useState('');
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null); 

  // --- ESTADO DE LA INTERVENCIÓN ---
  const [intervention, setIntervention] = useState({
    cliente: { nombre: '', instalacion: '', direccion: '', potencia_kva: '', n_grupo: '' },
    equipo: { marca: '', modelo: '', sn: '' },
    check: {}, 
    mediciones: { horas: '', presion: '', temp: '', combustible: '', tensionAlt: '', frecuencia: '', cargaBat: '' },
    pruebasCarga: { rs: '', st: '', rt: '', r: '', s: '', t: '', kw: '' },
    observaciones: '',
    recibidoPor: '',
    firmaCliente: null
  });

  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (task) {
        setIntervention(prev => ({
            ...prev,
            cliente: { 
              ...prev.cliente, 
              nombre: task.cliente?.nombre || prev.cliente.nombre, 
              instalacion: task.cliente?.instalacion || prev.cliente.instalacion,
            },
            equipo: { 
              ...prev.equipo, 
              marca: task.equipo?.marca || prev.equipo.marca,
              modelo: task.equipo?.modelo || prev.equipo.modelo, 
            },
            // Reset fields for new inspection
            check: {},
            mediciones: { horas: '', presion: '', temp: '', combustible: '', tensionAlt: '', frecuencia: '', cargaBat: '' },
            pruebasCarga: { rs: '', st: '', rt: '', r: '', s: '', t: '', kw: '' },
            observaciones: '',
            recibidoPor: '',
            firmaCliente: null
        }));
    }
  }, [task]);

  useEffect(() => {
    signInAnonymously(auth).then(() => onAuthStateChanged(auth, (u) => setCurrentUser(u)));
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return alert("Voz no soportada por el navegador.");
    const rec = new Speech();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.onstart = () => setIsRecording(true);
    rec.onresult = async (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('. ');
      processAiCommand(transcript);
    };
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const processAiCommand = async (text) => {
    setAiLoading(true);
    
    try {
      const res = await processDictation({ dictation: text });
      
      setIntervention(prev => {
        let newCheck = { ...prev.check, ...res.checklist_updates };
        
        const t = text.toLowerCase();
        const forceAllOk = res.all_ok === true || 
                           ((t.includes("todo") || t.includes("todos") || t.includes("pendientes")) && (t.includes("ok") || t.includes("okay") || t.includes("correcto")));
                           
        if (forceAllOk) {
          ALL_CHECKLIST_ITEMS.forEach(it => { 
            if(!newCheck[it] || newCheck[it] === '') {
              newCheck[it] = 'OK'; 
            }
          });
        }

        return {
          ...prev,
          cliente: {
            nombre: res.identidad?.cliente || prev.cliente.nombre,
            instalacion: res.identidad?.instalacion || prev.cliente.instalacion,
            direccion: res.identidad?.direccion || prev.cliente.direccion,
            n_grupo: res.identidad?.n_grupo || prev.cliente.n_grupo,
            potencia_kva: res.identidad?.potencia_kva || prev.cliente.potencia_kva
          },
          equipo: {
            marca: res.identidad?.marca || prev.equipo.marca,
            modelo: res.identidad?.modelo || prev.equipo.modelo,
            sn: res.identidad?.sn || prev.equipo.sn
          },
          check: newCheck,
          mediciones: {
            horas: res.mediciones_generales?.horas || prev.mediciones.horas,
            presion: res.mediciones_generales?.presion || prev.mediciones.presion,
            temp: res.mediciones_generales?.temp || prev.mediciones.temp,
            combustible: res.mediciones_generales?.combustible || prev.mediciones.combustible,
            tensionAlt: res.mediciones_generales?.tensionAlt || prev.mediciones.tensionAlt,
            frecuencia: res.mediciones_generales?.frecuencia || prev.mediciones.frecuencia,
            cargaBat: res.mediciones_generales?.cargaBat || prev.mediciones.cargaBat
          },
          pruebasCarga: {
            rs: res.pruebas_carga?.rs || prev.pruebasCarga.rs,
            st: res.pruebas_carga?.st || prev.pruebasCarga.st,
            rt: res.pruebas_carga?.rt || prev.pruebasCarga.rt,
            r: res.pruebas_carga?.r || prev.pruebasCarga.r,
            s: res.pruebas_carga?.s || prev.pruebasCarga.s,
            t: res.pruebas_carga?.t || prev.pruebasCarga.t,
            kw: res.pruebas_carga?.kw || prev.pruebasCarga.kw
          },
          recibidoPor: res.identidad?.recibe || prev.recibidoPor,
          observaciones: prev.observaciones + (prev.observaciones ? "\n\n" : "") + res.observations_summary
        }
      });
    } catch (e) {
        console.error("Fallo en processAiCommand:", e);
        alert("La IA tuvo problemas procesando el dictado. Intente de nuevo.");
    } finally { setAiLoading(false); }
  };

  const improveReport = async () => {
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: intervention.observaciones });
      setIntervention(p => ({
        ...p, observaciones: res.improved,
        cliente: { ...p.cliente, nombre: res.extra?.cliente || p.cliente.nombre, n_grupo: res.extra?.n_grupo || p.cliente.n_grupo, potencia_kva: res.extra?.potencia || p.cliente.potencia_kva },
        equipo: { ...p.equipo, modelo: res.extra?.modelo || p.equipo.modelo, sn: res.extra?.sn || p.equipo.sn },
        recibidoPor: res.extra?.recibe || p.recibidoPor
      }));
    } catch(e) {
        console.error("Fallo en improveReport:", e);
        alert("La IA tuvo problemas al refinar el informe. Intente de nuevo.");
    } finally { setAiLoading(false); }
  };

  const saveIntervention = async () => {
    setSaving(true);
    try {
      const id = Date.now().toString().slice(-6);
      const sanitize = (obj) => JSON.parse(JSON.stringify(obj, (k,v)=>v===undefined?null:v));
      const cleanData = sanitize({ ...intervention, tecnico: inspectorName, fecha: Timestamp.now(), reportCode: id });
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'intervenciones'), cleanData);
      
      setReportBaseID(id);
      setIsSaved(true);
    } catch (e) { alert("Error al guardar en la nube: " + e.message); } finally { setSaving(false); }
  };

  const generatePDF = (type) => {
    if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
      alert("El motor PDF no está listo. Por favor, espere un momento y vuelva a intentarlo.");
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF();
    
    if (typeof docPDF.autoTable !== 'function') {
      alert("El plugin autoTable para PDF no se cargó correctamente. Inténtalo de nuevo.");
      return;
    }
    
    const prefix = type === 'tecnico' ? 'TEC' : type === 'revision' ? 'REV' : 'ALB';
    const finalID = isSaved && reportBaseID ? `${prefix}-${reportBaseID}` : `${prefix}-BORRADOR`;

    const primary = [16, 185, 129];
    const textDark = [15, 23, 42];
    
    docPDF.setFillColor(15, 23, 42); 
    docPDF.rect(0, 0, 210, 35, 'F');
    docPDF.setTextColor(255); 
    docPDF.setFontSize(18); 
    docPDF.text("ENERGY ENGINE", 15, 18);
    docPDF.setTextColor(...primary); 
    docPDF.setFontSize(8); 
    docPDF.text("GESTIÓN DE MANTENIMIENTO INDUSTRIAL", 15, 25);
    docPDF.setTextColor(255); 
    docPDF.text(`REPORTE: ${finalID}`, 130, 18);
    docPDF.text(`FECHA: ${new Date().toLocaleDateString()}`, 130, 25);

    docPDF.autoTable({
      startY: 45,
      head: [[' DATOS DE IDENTIFICACIÓN', 'INFORMACIÓN REGISTRADA']],
      body: [
        ['CLIENTE / EMPRESA', intervention.cliente.nombre || '---'],
        ['DIRECCIÓN', intervention.cliente.direccion || '---'],
        ['INSTALACIÓN / UBICACIÓN', intervention.cliente.instalacion || '---'],
        ['Nº DE GRUPO', intervention.cliente.n_grupo || '---'],
        ['POTENCIA (KVA/KW)', intervention.cliente.potencia_kva || '---'],
        ['MARCA / MODELO', `${intervention.equipo.marca || '---'} ${intervention.equipo.modelo || '---'}`],
        ['Nº DE MOTOR (SN)', intervention.equipo.sn || '---']
      ],
      theme: 'grid', 
      headStyles: { fillColor: textDark, cellPadding: 3, fontSize: 10 },
      styles: { cellPadding: 3, fontSize: 9 },
      margin: { bottom: 15 }
    });

    let currentY = docPDF.lastAutoTable.finalY + 8;

    if (type === 'revision') {
      const body = [];
      Object.entries(CHECKLIST_SECTIONS).forEach(([title, items]) => {
        body.push([{ content: title, colSpan: 5, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [0,0,0], cellPadding: 3 } }]);
        items.forEach(it => {
          const v = intervention.check[it] || '';
          body.push([it, v==='OK'?'X':'', v==='DEF'?'X':'', v==='AVR'?'X':'', v==='CMB'?'X':'']);
        });
      });
      docPDF.autoTable({ 
        startY: currentY, 
        head: [['Ítem de Inspección', 'OK', 'DEF', 'AVR', 'CMB']], 
        body: body, 
        theme: 'grid', 
        headStyles: { fillColor: primary, cellPadding: 3, fontSize: 9 },
        styles: { cellPadding: 2, fontSize: 8, halign: 'center' },
        columnStyles: { 0: { halign: 'left' } },
        margin: { bottom: 15 } 
      });
      
      currentY = docPDF.lastAutoTable.finalY + 8;
      
      docPDF.autoTable({
        startY: currentY,
        head: [['Parámetro General', 'Valor', 'Pruebas con Carga', 'Valor (V / A)']],
        body: [
          ['Horas Funcionamiento', intervention.mediciones.horas || '---', 'Tensión RS', intervention.pruebasCarga.rs || '---'],
          ['Presión Aceite', intervention.mediciones.presion || '---', 'Tensión ST', intervention.pruebasCarga.st || '---'],
          ['Temperatura', intervention.mediciones.temp || '---', 'Tensión RT', intervention.pruebasCarga.rt || '---'],
          ['Nivel Combustible', intervention.mediciones.combustible || '---', 'Intensidad R', intervention.pruebasCarga.r || '---'],
          ['---', '---', 'Intensidad S', intervention.pruebasCarga.s || '---'],
          ['---', '---', 'Intensidad T', intervention.pruebasCarga.t || '---'],
          ['---', '---', 'Potencia (kW)', intervention.pruebasCarga.kw || '---']
        ],
        theme: 'striped', 
        headStyles: { fillColor: textDark, cellPadding: 3, fontSize: 9 },
        styles: { cellPadding: 3, fontSize: 8 },
        margin: { bottom: 15 }
      });
      currentY = docPDF.lastAutoTable.finalY + 10;
    }

    docPDF.autoTable({
        startY: currentY,
        head: [['OBSERVACIONES TÉCNICAS Y REPORTE DE INTERVENCIÓN']],
        body: [[intervention.observaciones || 'Sin incidencias reportadas o trabajos adicionales que detallar.']],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: textDark, fontStyle: 'bold', cellPadding: 4, fontSize: 10 },
        styles: { cellPadding: 5, fontSize: 9, lineColor: [200, 200, 200], lineWidth: 0.1 },
        margin: { bottom: 15 }
    });

    docPDF.autoTable({
        startY: docPDF.lastAutoTable.finalY + 15,
        theme: 'plain',
        head: [['Firma del Técnico', 'Firma del Cliente']],
        headStyles: { halign: 'center', textColor: textDark, fontStyle: 'bold', fontSize: 10 },
        body: [[inspectorName || 'Técnico Energy Engine', intervention.recibidoPor || 'No Especificado']],
        styles: { halign: 'center', cellPadding: 20, fontSize: 9 },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1 && intervention.firmaCliente) {
                docPDF.addImage(intervention.firmaCliente, 'PNG', data.cell.x + 15, data.cell.y + 5, 45, 18);
            }
        },
        margin: { bottom: 20 }
    });

    docPDF.save(`EnergyEngine_${finalID}.pdf`);
    setShowConfirmModal(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-48 font-sans text-left selection:bg-emerald-100">
      
      <div className="fixed bottom-10 right-8 z-[200] flex flex-col items-end gap-4">
        {isAiMenuOpen && (
          <div className="flex flex-col items-end gap-3 mb-4 animate-in slide-in-from-bottom-6">
            <button onClick={() => { toggleRecording(); setIsAiMenuOpen(false); }} className={`flex items-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase border-2 border-white transition-all ${isRecording ? 'bg-red-500 animate-pulse' : ''}`}>
              {isRecording ? <StopCircle size={18}/> : <Mic size={18}/>} Dictado IA ✨
            </button>
            <button onClick={() => { improveReport(); setIsAiMenuOpen(false); }} className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase border-2 border-white transition-all">
              <Wand2 size={18}/> Refinar / Extraer Datos ✨
            </button>
          </div>
        )}
        <button onClick={() => setIsAiMenuOpen(!isAiMenuOpen)} className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-white ${isAiMenuOpen ? 'bg-slate-900 rotate-90' : 'bg-emerald-600'}`}>
          {isAiMenuOpen ? <X className="text-white" size={32}/> : <BrainCircuit className="text-white" size={32}/>}
          {aiLoading && <div className="absolute inset-0 rounded-[2.5rem] border-4 border-emerald-300 border-t-transparent animate-spin"></div>}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-6 text-center">
             <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto"><Printer size={32}/></div>
             <div className="space-y-2">
                <h3 className="font-black text-2xl uppercase tracking-tighter">Confirmar Informe</h3>
                {isSaved ? (
                   <p className="text-slate-500">Se imprimirá el documento oficial <span className="font-bold text-slate-900">{showConfirmModal === 'tecnico' ? 'TEC' : showConfirmModal === 'revision' ? 'REV' : 'ALB'}-{reportBaseID}</span>.</p>
                ) : (
                   <p className="text-amber-600 font-bold bg-amber-50 p-4 rounded-2xl">Atención: Aún no has guardado en la nube. Se generará un <span className="font-black">BORRADOR</span> sin validez oficial.</p>
                )}
             </div>
             <div className="flex gap-4 pt-2">
                <button onClick={() => setShowConfirmModal(null)} className="flex-1 p-5 rounded-2xl font-bold bg-slate-100 text-slate-400 uppercase text-xs tracking-widest hover:bg-slate-200">Atrás</button>
                <button onClick={() => generatePDF(showConfirmModal)} className="flex-1 p-5 rounded-2xl font-black bg-emerald-600 text-white shadow-lg uppercase text-xs tracking-widest hover:bg-emerald-700 active:scale-95">Imprimir</button>
             </div>
          </div>
        </div>
      )}

      <nav className="p-6 bg-white border-b sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-slate-900"><EnergyLogo className="w-8 h-8"/><span className="font-black text-lg uppercase tracking-tighter">Energy Engine</span></div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase leading-none tracking-widest">Técnico RTS</p>
          <p className="text-sm font-black text-emerald-600 uppercase">{inspectorName}</p>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-10">
        
        <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-8 border border-slate-100">
             <h2 className="text-2xl font-black text-black border-l-4 border-emerald-500 pl-4 uppercase tracking-tighter">Identificación del ADN</h2>          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StableInput label="Empresa / Cliente" icon={Users} value={intervention.cliente.nombre} onChange={v => setIntervention(p => ({...p, cliente: {...p.cliente, nombre: v}}))}/>
            <StableInput label="Instalación / Ubicación" icon={MapPin} value={intervention.cliente.instalacion} onChange={v => setIntervention(p => ({...p, cliente: {...p.cliente, instalacion: v}}))}/>
            <StableInput label="Dirección Postal" icon={Mail} value={intervention.cliente.direccion} onChange={v => setIntervention(p => ({...p, cliente: {...p.cliente, direccion: v}}))}/>
            <div className="grid grid-cols-2 gap-4">
              <StableInput label="Nº de Grupo" value={intervention.cliente.n_grupo} onChange={v => setIntervention(p => ({...p, cliente: {...p.cliente, n_grupo: v}}))}/>
              <StableInput label="Potencia" value={intervention.cliente.potencia_kva} onChange={v => setIntervention(p => ({...p, cliente: {...p.cliente, potencia_kva: v}}))}/>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <StableInput label="Marca del Motor" icon={Settings} value={intervention.equipo.marca} onChange={v => setIntervention(p => ({...p, equipo: {...p.equipo, marca: v}}))}/>
            <StableInput label="Modelo de Motor" value={intervention.equipo.modelo} onChange={v => setIntervention(p => ({...p, equipo: {...p.equipo, modelo: v}}))}/>
            <StableInput label="Número de Serie (SN)" value={intervention.equipo.sn} onChange={v => setIntervention(p => ({...p, equipo: {...p.equipo, sn: v}}))}/>
          </div>
        </section>

        {Object.entries(CHECKLIST_SECTIONS).map(([section, items]) => (
          <section key={section} className="bg-white p-10 rounded-[3rem] shadow-sm space-y-6 border border-slate-100">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] opacity-30">{section}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {items.map(it => (
                <div key={it} className={`p-4 rounded-2xl flex justify-between items-center transition-all border-2 ${intervention.check[it] ? 'bg-emerald-50 border-emerald-100 shadow-inner' : 'bg-slate-50 border-transparent shadow-sm'}`}>
                  <span className="text-[12px] font-bold text-slate-700 leading-tight pr-2">{it}</span>
                  <div className="flex gap-1">
                    {["OK", "DEF", "AVR", "CMB"].map(st => (
                      <button key={st} onClick={() => setIntervention(p => ({...p, check: {...p.check, [it]: st}}))} className={`w-10 h-8 rounded-lg text-[8px] font-black border-2 transition-all ${intervention.check[it] === st ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-110' : 'bg-white border-slate-200 text-slate-300 hover:border-slate-300 hover:bg-slate-100'}`}>{st}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 text-left">
          <h2 className="text-xl font-black flex items-center gap-3 text-emerald-600 uppercase tracking-tighter"><Zap size={20}/> Pruebas Eléctricas y Carga</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
             <StableInput label="Horas Operat." value={intervention.mediciones.horas} onChange={v => setIntervention(p => ({...p, mediciones: {...p.mediciones, horas: v}}))}/>
             <StableInput label="Presión Aceite" value={intervention.mediciones.presion} onChange={v => setIntervention(p => ({...p, mediciones: {...p.mediciones, presion: v}}))}/>
             <StableInput label="Tensión RS (V)" value={intervention.pruebasCarga.rs} onChange={v => setIntervention(p => ({...p, pruebasCarga: {...p.pruebasCarga, rs: v}}))}/>
             <StableInput label="Tensión ST (V)" value={intervention.pruebasCarga.st} onChange={v => setIntervention(p => ({...p, pruebasCarga: {...p.pruebasCarga, st: v}}))}/>
             <StableInput label="Intensidad R (A)" value={intervention.pruebasCarga.r} onChange={v => setIntervention(p => ({...p, pruebasCarga: {...p.pruebasCarga, r: v}}))}/>
             <StableInput label="Intensidad S (A)" value={intervention.pruebasCarga.s} onChange={v => setIntervention(p => ({...p, pruebasCarga: {...p.pruebasCarga, s: v}}))}/>
             <StableInput label="Potencia kW" value={intervention.pruebasCarga.kw} onChange={v => setIntervention(p => ({...p, pruebasCarga: {...p.pruebasCarga, kw: v}}))}/>
          </div>
        </section>

        <section className="bg-white p-10 rounded-[3rem] shadow-sm space-y-6 border border-slate-100">
           <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Type className="text-emerald-500"/> Notas del Informe</h2>
           <textarea className="w-full h-64 bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 outline-none focus:border-emerald-500 font-medium text-slate-600 shadow-inner resize-none leading-relaxed" placeholder="Las notas dictadas aparecerán aquí..." value={intervention.observaciones} onChange={e => setIntervention(p => ({...p, observaciones: e.target.value}))}/>
        </section>

        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 text-center">
          <StableInput label="Persona que recibe (Nombre)" icon={Users} value={intervention.recibidoPor} onChange={v => setIntervention(p => ({...p, recibidoPor: v}))}/>
          <div className="bg-slate-50 h-48 border-2 border-dashed rounded-[2rem] relative shadow-inner overflow-hidden">
             <canvas ref={canvasRef} width={600} height={192} className="w-full h-full cursor-crosshair touch-none" onMouseDown={(e) => { canvasRef.current.drawing = true; const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); }} onMouseMove={(e) => { if(!canvasRef.current.drawing) return; const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); ctx.stroke(); }} onMouseUp={() => { canvasRef.current.drawing = false; setIntervention(p => ({...p, firmaCliente: canvasRef.current.toDataURL()})); }}/>
          </div>
          <button onClick={() => { canvasRef.current.getContext('2d').clearRect(0,0,600,192); setIntervention(p => ({...p, firmaCliente: null})); }} className="text-red-500 font-black text-[10px] uppercase tracking-tighter">Limpiar Firma</button>
        </section>

        <button disabled={saving || isSaved} onClick={saveIntervention} className={`w-full p-10 rounded-[3rem] shadow-2xl flex items-center justify-center gap-6 hover:scale-[1.02] active:scale-95 transition-all ${isSaved ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500' : 'bg-slate-900 text-white'}`}>
          <div className="text-left">
            <p className="font-black text-2xl uppercase tracking-tighter tracking-widest">{isSaved ? 'Sincronizado RTS' : 'FINALIZAR INTERVENCIÓN ✨'}</p>
            <p className="text-xs font-bold uppercase tracking-widest opacity-60">{isSaved ? `ID: RTS-${reportBaseID}` : 'Guardar y oficializar documento en la nube'}</p>
          </div>
          {saving ? <RefreshCcw className="animate-spin text-emerald-500" size={40}/> : isSaved ? <CheckCircle2 size={40}/> : <Save size={40} className="text-emerald-500"/>}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <button onClick={() => setShowConfirmModal('tecnico')} className={`p-8 rounded-[2.5rem] border-2 shadow-lg text-left group transition-all bg-white border-slate-100 hover:border-emerald-500 hover:shadow-xl`}>
            <FileText className={`text-emerald-500 mb-3 group-hover:scale-110 transition-transform`} size={32}/>
            <p className="font-black text-slate-800 uppercase text-[10px]">Informe Técnico</p>
            <p className="text-[8px] font-bold text-slate-400">{isSaved ? `TEC-${reportBaseID}` : 'Imprimir Borrador'}</p>
          </button>
          <button onClick={() => setShowConfirmModal('revision')} className={`p-8 rounded-[2.5rem] border-2 shadow-lg text-left group transition-all bg-white border-slate-100 hover:border-emerald-500 hover:shadow-xl`}>
            <ShieldCheck className={`text-emerald-500 mb-3 group-hover:scale-110 transition-transform`} size={32}/>
            <p className="font-black text-slate-800 uppercase text-[10px]">Ficha Getafe</p>
            <p className="text-[8px] font-bold text-slate-400">{isSaved ? `REV-${reportBaseID}` : 'Imprimir Borrador'}</p>
          </button>
          <button onClick={() => setShowConfirmModal('albaran')} className={`p-8 rounded-[2.5rem] shadow-xl text-left group transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            <Printer className={`${isSaved ? 'text-white' : 'text-slate-400'} mb-3 group-hover:scale-110 transition-transform`} size={32}/>
            <p className="font-black uppercase text-[10px]">Albarán Final</p>
            <p className={`text-[8px] font-bold ${isSaved ? 'text-emerald-200' : 'text-slate-500'}`}>{isSaved ? `ALB-${reportBaseID}` : 'Imprimir Borrador'}</p>
          </button>
        </div>
        
        {isSaved && <button onClick={() => { setIsSaved(false); setIntervention({cliente: { nombre: '', instalacion: '', direccion: '', potencia_kva: '', n_grupo: '' }, equipo: { marca: '', modelo: '', sn: '' }, check: {}, mediciones: { horas: '', presion: '', temp: '', combustible: '', tensionAlt: '', frecuencia: '', cargaBat: '' }, pruebasCarga: { rs: '', st: '', rt: '', r: '', s: '', t: '', kw: '' }, observaciones: '', fotos: { equipo: null, recepcion: null }, recibidoPor: '', firmaCliente: null}); setReportBaseID(''); }} className="w-full text-center text-slate-400 font-black text-xs uppercase hover:text-emerald-600 transition-colors">Iniciar Nueva Revisión</button>}
      </main>

      <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md p-4 border-t flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] z-50">
           <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Gemini AI Enabled • Energy Engine RTS v6.2</div>
      </footer>
    </div>
  );
}

