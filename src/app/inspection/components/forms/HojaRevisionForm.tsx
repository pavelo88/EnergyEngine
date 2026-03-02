'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap, Mic } from 'lucide-react';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
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

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
  const doc = new jsPDF();
  const finalID = reportId || 'BORRADOR';
  const darkColor = '#0f172a';
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Márgenes (Definimos los 4 lados estrictamente)
  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 40;  // Espacio a salvo debajo del encabezado
  const bottomMargin = 30; // Espacio a salvo encima del pie de página
  const contentWidth = pageWidth - leftMargin - rightMargin;
  
  // Configuración global de márgenes para TODAS las tablas
  const globalMargin = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };

  let currentY = topMargin;

  // 1. Título Principal
  doc.setTextColor(darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`HOJA DE REVISIÓN - Nº: ${finalID}`, leftMargin, currentY);
  currentY += 6;

  // 2. Tabla de Datos Generales
  autoTable(doc, {
      startY: currentY,
      body: [
          [{ content: 'CLIENTE:', styles: { fontStyle: 'bold', cellWidth: 35 } }, { content: report.cliente || '', colSpan: 3 }],
          [{ content: 'INSTALACIÓN:', styles: { fontStyle: 'bold' } }, { content: report.instalacion || '', colSpan: 3 }],
          [{ content: 'DIRECCIÓN:', styles: { fontStyle: 'bold' } }, { content: report.direccion || '', colSpan: 3 }],
          [{ content: 'UBICACIÓN (LAT/LON):', styles: { fontStyle: 'bold' } }, { content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3 }],
          [{ content: 'FECHA REVISIÓN:', styles: { fontStyle: 'bold' } }, report.fecha_revision || '', { content: 'POTENCIA:', styles: { fontStyle: 'bold', cellWidth: 30 } }, report.potencia || ''],
          [{ content: 'MOTOR:', styles: { fontStyle: 'bold' } }, report.motor || '', { content: 'Nº MOTOR:', styles: { fontStyle: 'bold' } }, report.n_motor || ''],
          [{ content: 'MODELO:', styles: { fontStyle: 'bold' } }, report.modelo || '', { content: 'Nº GRUPO:', styles: { fontStyle: 'bold' } }, report.n_grupo || ''],
      ],
      theme: 'grid', 
      styles: { fontSize: 8, cellPadding: 2 },
      margin: globalMargin // <-- Aplicado aquí
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. Tabla Checklist
  const colWidth = 22; 
  autoTable(doc, {
      startY: currentY,
      head: [['INSPECCIÓN / ESTADO', 'OK', 'DEFECTUOSO', 'AVERIADO', 'CAMBIO']],
      body: Object.entries(CHECKLIST_SECTIONS).flatMap(([section, items]) => {
          const sectionRows: any[] = [[{ content: section, colSpan: 5, styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#000', halign: 'left' }}]];
          (items as string[]).forEach(item => {
              sectionRows.push([
                  item,
                  report.checklist?.[item] === 'OK' ? 'X' : '',
                  report.checklist?.[item] === 'DEFECT' ? 'X' : '',
                  report.checklist?.[item] === 'AVERIA' ? 'X' : '',
                  report.checklist?.[item] === 'CAMBIO' ? 'X' : '',
              ]);
          });
          return sectionRows;
      }),
      theme: 'grid', 
      styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: darkColor, textColor: '#fff', halign: 'center' },
      columnStyles: { 
          0: { halign: 'left' },
          1: { cellWidth: colWidth },
          2: { cellWidth: colWidth },
          3: { cellWidth: colWidth },
          4: { cellWidth: colWidth }
      },
      margin: globalMargin // <-- LA SOLUCIÓN AL CORTE ESTÁ AQUÍ
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  if (currentY + 60 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  // 4. Tabla de Pruebas
  autoTable(doc, {
      startY: currentY,
      body: [
          [{ content: 'DATOS DE PRUEBAS', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' }}, { content: 'VALORES', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' }}],
          ['Horas de funcionamiento', report.datos_pruebas?.horas || ''],
          ['Presión aceite', report.datos_pruebas?.presion || ''],
          ['Temperatura en bloque motor', report.datos_pruebas?.temperatura || ''],
          ['Nivel de deposito de combustible', report.datos_pruebas?.nivel_combustible || ''],
          ['Tensión en el alternador', report.datos_pruebas?.tension_alternador || ''],
          ['Frecuencia', report.datos_pruebas?.frecuencia || ''],
          ['Carga de baterías', report.datos_pruebas?.carga_baterias || ''],
          [{ content: 'PRUEBAS CON CARGA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' }}],
          [{ content: `Tensión: RS: ${report.pruebas_carga?.tension_rs || ''}   ST: ${report.pruebas_carga?.tension_st || ''}   RT: ${report.pruebas_carga?.tension_rt || ''}`, colSpan: 2 }],
          [{ content: `Intensidad: R: ${report.pruebas_carga?.intensidad_r || ''}   S: ${report.pruebas_carga?.intensidad_s || ''}   T: ${report.pruebas_carga?.intensidad_t || ''}`, colSpan: 2 }],
          [{ content: `Potencia: ${report.pruebas_carga?.potencia_kw || ''} kW`, colSpan: 2 }],
      ],
      theme: 'grid', 
      styles: { fontSize: 8, cellPadding: 2 },
      margin: globalMargin // <-- Aplicado aquí
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. OBSERVACIONES
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkColor);
  
  if (currentY + 15 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }
  
  doc.text("OBSERVACIONES", leftMargin, currentY);
  currentY += 4;

  const rawText = report.observaciones || '';
  const blocks = rawText.split('\n\n'); // Usar doble enter para párrafos

  blocks.forEach((block: string) => {
      const text = block.replace(/\n/g, ' ').trim(); // Limpiar saltos simples
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
              margin: globalMargin, // <-- Aplicado aquí
              body: [[text]],
              theme: 'plain',
              styles: {
                  font: 'helvetica',
                  fontSize: 9,
                  cellPadding: 0,
                  halign: 'justify',
                  textColor: darkColor
              },
              columnStyles: { 0: { cellWidth: contentWidth } }
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
      }
  });

  currentY += 8;

  // 6. FIRMAS
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
  
  // 7. ENCABEZADOS Y PIES DE PÁGINA GLOBALES
  const drawHeader = () => {
      doc.setFillColor(darkColor);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("ENERGY ENGINE", 15, 18);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text("C. Miguel López Bravo, 6, 45313 Yepes, Toledo", pageWidth - 15, 12, { align: 'right' });
      doc.text("info@energyengine.es | +34 925 15 43 54", pageWidth - 15, 18, { align: 'right' });
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
      doc.setFillColor(darkColor);
      doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
  };

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawHeader();
      drawFooter(i, totalPages);
  }

  return doc;
};
export default function HojaRevisionForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
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
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
          cliente: initialData.clienteNombre || prev.cliente,
          instalacion: initialData.cliente?.instalacion || prev.instalacion,
          direccion: initialData.cliente?.direccion || prev.direccion,
          motor: initialData.equipo?.modelo || prev.motor,
          modelo: initialData.equipo?.marca || prev.modelo,
          n_motor: initialData.equipo?.sn || prev.n_motor,
          n_grupo: initialData.equipo?.n_grupo || prev.n_grupo,
          potencia: initialData.equipo?.potencia_kva || prev.potencia,
          observaciones: initialData.descripcion || prev.observaciones,
      }));
    }
  }, [initialData]);

  // Effect to process incoming AI data from global dictation
  useEffect(() => {
    if (aiData) {
      setFormData(prev => {
          const newChecklist = { ...prev.checklist, ...aiData.checklist_updates };
          if (aiData.all_ok) {
            Object.values(CHECKLIST_SECTIONS).flat().forEach(item => {
              if (!newChecklist[item]) {
                newChecklist[item] = 'OK';
              }
            });
          }

          return {
            ...prev,
            cliente: aiData.identidad.cliente || prev.cliente,
            instalacion: aiData.identidad.instalacion || prev.instalacion,
            direccion: aiData.identidad.direccion || prev.direccion,
            motor: aiData.identidad.modelo || prev.motor,
            modelo: aiData.identidad.marca || prev.modelo,
            n_motor: aiData.identidad.sn || prev.n_motor,
            n_grupo: aiData.identidad.n_grupo || prev.n_grupo,
            potencia: aiData.identidad.potencia_kva || prev.potencia,
            recibidoPor: aiData.identidad.recibe || prev.recibidoPor,
            observaciones: aiData.observations_summary || prev.observaciones,
            checklist: newChecklist,
            datos_pruebas: {
              horas: aiData.mediciones_generales.horas || prev.datos_pruebas.horas,
              presion: aiData.mediciones_generales.presion || prev.datos_pruebas.presion,
              temperatura: aiData.mediciones_generales.temp || prev.datos_pruebas.temperatura,
              nivel_combustible: aiData.mediciones_generales.combustible || prev.datos_pruebas.nivel_combustible,
              tension_alternador: aiData.mediciones_generales.tensionAlt || prev.datos_pruebas.tension_alternador,
              frecuencia: aiData.mediciones_generales.frecuencia || prev.datos_pruebas.frecuencia,
              carga_baterias: aiData.mediciones_generales.cargaBat || prev.datos_pruebas.carga_baterias,
            },
            pruebas_carga: {
              tension_rs: aiData.pruebas_carga.rs || prev.pruebas_carga.tension_rs,
              tension_st: aiData.pruebas_carga.st || prev.pruebas_carga.tension_st,
              tension_rt: aiData.pruebas_carga.rt || prev.pruebas_carga.tension_rt,
              intensidad_r: aiData.pruebas_carga.r || prev.pruebas_carga.intensidad_r,
              intensidad_s: aiData.pruebas_carga.s || prev.pruebas_carga.intensidad_s,
              intensidad_t: aiData.pruebas_carga.t || prev.pruebas_carga.intensidad_t,
              potencia_kw: aiData.pruebas_carga.kw || prev.pruebas_carga.potencia_kw,
            }
          };
      });
    }
  }, [aiData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };
  
  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleChecklistChange = (item, status) => {
    setFormData(prev => ({ ...prev, checklist: { ...prev.checklist, [item]: status } }));
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
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
      },
      () => {
        alert('No se pudo obtener la ubicación. Revisa los permisos del navegador.');
        setLocationStatus('error');
      }
    );
  };
  
  const handlePdfAction = () => {
    if (!saving) {
        const reportData = {
          ...formData,
          inspectorSignatureUrl: inspectorSignature,
          clientSignatureUrl: clientSignature,
        };
        const doc = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');
        if (isSaved) {
            doc.save(`Hoja_Revision_${savedDocId}.pdf`);
        } else {
            setPreviewPdfUrl(doc.output('datauristring'));
        }
    }
  };

  const handleSave = async () => {
    if (!db || !user) return alert("Error de autenticación.");
    if (isSaved) return;

    setSaving(true);
    const year = new Date().getFullYear().toString().slice(-2);
    const sequential = Date.now().toString().slice(-4);
    const docId = `REV-${year}-${sequential}`;
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
    <div className="animate-in fade-in w-full bg-slate-50 min-h-screen">
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
        
        <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-20">
          <h1 className="text-lg font-bold tracking-wider uppercase">Energy Engine</h1>
        </header>

        <main className="p-4 md:p-6 space-y-8 pb-40">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-blue-500 pl-4 uppercase tracking-tighter">Hoja de Revisión</h2>
            </div>

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
                    
                        <button 
                            onClick={handleCaptureLocation} 
                            disabled={locationStatus === 'loading'} 
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 flex items-center justify-center gap-3 font-bold text-slate-700 shadow-sm text-sm hover:border-blue-500 transition-colors disabled:opacity-50"
                        >
                            {locationStatus === 'loading' && <Loader2 className="animate-spin text-blue-500" size={16}/>}
                            {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 className="text-green-500" size={16}/> : <MapPin className="text-slate-400" size={16}/>)}
                            <span>{formData.location ? `${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación'}</span>
                        </button>
                    
                </div>
            </section>
            
            {/* --- CHECKLISTS --- */}
            {Object.entries(CHECKLIST_SECTIONS).map(([section, items]) => (
                <section key={section} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                    <h3 className="font-bold text-slate-500">{section}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {(items as string[]).map(it => (
                        <div key={it} className={`p-4 rounded-xl flex justify-between items-center transition-all border ${formData.checklist[it] ? 'bg-blue-50/50 border-blue-200/50' : 'bg-slate-50/50 border-slate-100'}`}>
                            <span className="text-lg font-bold text-slate-700">{it}</span>
                            <div className="flex gap-1">
                            {["OK", "DEFECT", "AVERIA", "CAMBIO"].map(st => (
                                <button key={st} onClick={() => handleChecklistChange(it, st)} className={`w-14 h-8 rounded-lg text-[10px] font-black border-2 transition-all ${formData.checklist[it] === st ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300'}`}>{st}</button>
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
                <textarea className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-xl p-4 resize-none" placeholder="Añade tus observaciones aquí..." value={formData.observaciones} onChange={e => handleInputChange('observaciones', e.target.value)}/>
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
                <button onClick={handlePdfAction} disabled={saving} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
                    {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
                    {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
                </button>
                <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
                    {saving ? <Loader2 className="animate-spin text-blue-500" /> : isSaved ? <CheckCircle2 className="text-blue-500" /> : <Save className="text-blue-500" />}
                    {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR REVISIÓN'}
                </button>
            </div>
        </main>
    </div>
  );
}
