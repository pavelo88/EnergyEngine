'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Car, Euro, Zap, Thermometer, Battery, Droplets, Wind, Gauge, Mic } from 'lucide-react';
import { enhanceTechnicalRequest, ProcessDictationOutput } from '@/ai/flows/enhance-technical-request-flow';
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
    <div className="flex flex-col items-center gap-1">
        <label className="text-[9px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-amber-500 focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm text-center"
        />
    </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
  const doc = new jsPDF();
  const finalID = reportId || 'BORRADOR';
  const darkColor = '#0f172a'; // Slate-900
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Márgenes
  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 40;
  const bottomMargin = 30;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  let currentY = 40;

  // 1. Sub-header (Título y Nº)
  doc.setTextColor(darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text("ALBARÁN DE TRABAJO", leftMargin, currentY);

  doc.setFontSize(10);
  doc.text(`Nº: ${finalID}`, pageWidth - rightMargin, currentY, { align: 'right' });
  currentY += 6;

  // 2. Tabla de Cliente y Servicio
  autoTable(doc, {
      startY: currentY,
      body: [
          [{content: 'CLIENTE:', styles: {fontStyle: 'bold'}}, report.cliente, {content: 'FECHA:', styles: {fontStyle: 'bold'}}, report.fecha],
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

  // 3. TRABAJOS REALIZADOS (Reubicado aquí arriba y con justificado/salto de página)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("TRABAJOS REALIZADOS", leftMargin, currentY);
  currentY += 4;

  const rawText = report.trabajos_realizados || '';
  const blocks = rawText.split('\n');

  blocks.forEach((block: string) => {
      const text = block.trim();
      if (!text) {
          currentY += 3;
          return;
      }

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
              styles: {
                  font: 'helvetica',
                  fontSize: 9,
                  cellPadding: 0,
                  halign: 'justify', // Justificado perfecto
                  textColor: darkColor
              },
              columnStyles: { 0: { cellWidth: contentWidth } }
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
      }
  });

  currentY += 6;

  // 4. PARÁMETROS TÉCNICOS
  // Comprobamos si cabe en la página, si no, salto.
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
          [`Horas: ${report.parametrosTecnicos.horas}`, `Presión Aceite: ${report.parametrosTecnicos.presionAceite}`, `Tensión: ${report.parametrosTecnicos.tension}`],
          [`Tª (°C): ${report.parametrosTecnicos.temperatura}`, `Nivel Combustible (%): ${report.parametrosTecnicos.nivelCombustible}`, `Frecuencia (Hz): ${report.parametrosTecnicos.frecuencia}`],
          [{content: `Tensión de baterías (V): ${report.parametrosTecnicos.tensionBaterias}`, colSpan: 3}],
      ],
      theme: 'grid',
      styles: {fontSize: 8, cellPadding: 1.5, minCellHeight: 8},
      bodyStyles: {fontStyle: 'bold'},
      margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. POTENCIA CON CARGA
  // Comprobamos si cabe en la página
  if (currentY + 45 > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Potencia con carga: ${report.potenciaConCarga.potencia}`, leftMargin, currentY);
  currentY += 3;

  autoTable(doc, {
      startY: currentY,
      head: [['Tensión', 'Intensidad', 'Potencia (kW)']],
      body: [
          [`RS: ${report.potenciaConCarga.tensionRS}`, `R: ${report.potenciaConCarga.intensidadR}`, {rowSpan: 3, content: report.potenciaConCarga.potenciaKW, styles: {valign: 'middle', halign: 'center'}}],
          [`ST: ${report.potenciaConCarga.tensionST}`, `S: ${report.potenciaConCarga.intensidadS}`],
          [`RT: ${report.potenciaConCarga.tensionRT}`, `T: ${report.potenciaConCarga.intensidadT}`],
      ],
      theme: 'grid',
      styles: {fontSize: 9, cellPadding: 1.5, minCellHeight: 8},
      headStyles: { fillColor: darkColor, textColor: '#fff' },
      bodyStyles: {fontStyle: 'bold'},
      margin: { left: leftMargin, right: rightMargin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 6. FIRMAS
  const signatureBlockHeight = 45;
  // Si las firmas ya no caben al final de la hoja, creamos una página nueva solo para ellas
  if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Firma Técnico (Izquierda)
  if (report.inspectorSignatureUrl) {
      doc.addImage(report.inspectorSignatureUrl, 'PNG', 25, currentY, 60, 25);
  }
  doc.line(25, currentY + 25, 85, currentY + 25);
  doc.text("Firma técnico:", 25, currentY + 30);
  doc.text(inspectorName || '', 25, currentY + 35);

  // Firma Cliente (Derecha)
  if (report.clientSignatureUrl) {
      doc.addImage(report.clientSignatureUrl, 'PNG', 125, currentY, 60, 25);
  }
  doc.line(125, currentY + 25, 185, currentY + 25);
  doc.text("Conforme cliente:", 125, currentY + 30);
  doc.text(report.recibidoPor || '', 125, currentY + 35);
  
  // 7. DIBUJAR ENCABEZADOS Y PIES DE PÁGINA GLOBALES
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
      // Frase de agradecimiento centrada
      doc.setTextColor(darkColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      // Paginación y franja
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


export default function AlbaranForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const [inspectorName, setInspectorName] = useState('');
  
  const [formData, setFormData] = useState({
    cliente: '',
    instalacion: '',
    motor: '',
    n_motor: '',
    grupo: '',
    n_grupo: '',
    n_pedido: '',
    location: null as { lat: number, lon: number } | null,
    fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD
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
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchUserName = async () => {
        if (user && user.email && db) {
            try {
                const userDocRef = doc(db, 'usuarios', user.email);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userName = userDocSnap.data().nombre;
                    setInspectorName(userName);
                    setFormData(prev => ({...prev, tecnicos: userName}));
                } else {
                     setInspectorName(user.email || 'Técnico');
                     setFormData(prev => ({...prev, tecnicos: user.email || 'Técnico' }));
                }
            } catch(e) {
                console.error("Error fetching user name:", e);
                setInspectorName(user.email || 'Técnico');
                setFormData(prev => ({...prev, tecnicos: user.email || 'Técnico' }));
            }
        }
    };
    fetchUserName();
  }, [user, db]);

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

  // Effect to process incoming AI data
  useEffect(() => {
    if (aiData) {
      setFormData(prev => ({
        ...prev,
        cliente: aiData.identidad.cliente || prev.cliente,
        instalacion: aiData.identidad.instalacion || prev.instalacion,
        motor: aiData.identidad.modelo || prev.motor,
        n_motor: aiData.identidad.sn || prev.n_motor,
        grupo: aiData.identidad.n_grupo || prev.grupo,
        recibidoPor: aiData.identidad.recibe || prev.recibidoPor,
        trabajos_realizados: aiData.observations_summary || prev.trabajos_realizados,
        parametrosTecnicos: {
          horas: aiData.mediciones_generales.horas || prev.parametrosTecnicos.horas,
          presionAceite: aiData.mediciones_generales.presion || prev.parametrosTecnicos.presionAceite,
          tension: aiData.mediciones_generales.tensionAlt || prev.parametrosTecnicos.tension,
          temperatura: aiData.mediciones_generales.temp || prev.parametrosTecnicos.temperatura,
          nivelCombustible: aiData.mediciones_generales.combustible || prev.parametrosTecnicos.nivelCombustible,
          frecuencia: aiData.mediciones_generales.frecuencia || prev.parametrosTecnicos.frecuencia,
          tensionBaterias: aiData.mediciones_generales.cargaBat || prev.parametrosTecnicos.tensionBaterias,
        },
        potenciaConCarga: {
          ...prev.potenciaConCarga,
          tensionRS: aiData.pruebas_carga.rs || prev.potenciaConCarga.tensionRS,
          tensionST: aiData.pruebas_carga.st || prev.potenciaConCarga.tensionST,
          tensionRT: aiData.pruebas_carga.rt || prev.potenciaConCarga.tensionRT,
          intensidadR: aiData.pruebas_carga.r || prev.potenciaConCarga.intensidadR,
          intensidadS: aiData.pruebas_carga.s || prev.potenciaConCarga.intensidadS,
          intensidadT: aiData.pruebas_carga.t || prev.potenciaConCarga.intensidadT,
          potenciaKW: aiData.pruebas_carga.kw || prev.potenciaConCarga.potenciaKW,
        }
      }));
    }
  }, [aiData]);

  const handleInputChange = (field: string, value: any) => {
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

  const improveReport = async () => {
    if (!formData.trabajos_realizados) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData.trabajos_realizados });
      setFormData(p => ({
        ...p, 
        trabajos_realizados: res.improved,
      }));
    } catch(e) {
      console.error("AI enhancement failed:", e);
      alert("La IA tuvo problemas al refinar el informe.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePdfAction = () => {
    if (!formData.cliente || !formData.instalacion) return alert("El cliente y la instalación son obligatorios.");
    
    const reportData = {
      ...formData,
      inspectorSignatureUrl: inspectorSignature,
      clientSignatureUrl: clientSignature,
    };
    
    const doc = generatePDF(reportData, inspectorName, isSaved ? savedDocId : 'BORRADOR');

    if (isSaved) {
      doc.save(`Albaran_${savedDocId}.pdf`);
    } else {
      setPreviewPdfUrl(doc.output('datauristring'));
    }
  };

  const handleSave = async () => {
    if (!db || !user) {
        alert("Error de autenticación. Por favor, recarga la página.");
        return;
    }
    if (!clientSignature || !inspectorSignature) {
        alert("Ambas firmas son obligatorias para guardar el albarán.");
        return;
    }
    
    setSaving(true);
    const year = new Date().getFullYear();
    const sequential = Date.now().toString().slice(-4).padStart(4, '0');
    const docId = `ALB-${year}-${sequential}`;

    try {
      const docData = {
        ...formData,
        inspectorSignatureUrl: inspectorSignature, // NOTE: For production, upload to Storage and save URL
        clientSignatureUrl: clientSignature,       // NOTE: For production, upload to Storage and save URL
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
      alert("Hubo un error al guardar el albarán. Revisa la consola para más detalles.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in w-full bg-slate-50 min-h-screen">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Vista Previa del Albarán</DialogTitle>
             <DialogDescription>Revisa el borrador antes de guardarlo. Este NO es el documento final.</DialogDescription>
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
            <h2 className="text-2xl font-black text-slate-800 border-l-4 border-amber-500 pl-4 uppercase tracking-tighter">Albarán de Trabajo</h2>
        </div>
      
      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            <div className="lg:col-span-2 space-y-3">
              <StableInput label="Cliente" icon={Users} value={formData.cliente} onChange={v => handleInputChange('cliente', v)}/>
              <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={v => handleInputChange('instalacion', v)}/>
              <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={v => handleInputChange('motor', v)}/>
              <StableInput label="N' Motor" icon={Hash} value={formData.n_motor} onChange={v => handleInputChange('n_motor', v)}/>
              <StableInput label="Grupo" icon={Settings} value={formData.grupo} onChange={v => handleInputChange('grupo', v)}/>
              <StableInput label="N' Grupo" icon={Hash} value={formData.n_grupo} onChange={v => handleInputChange('n_grupo', v)}/>
              <StableInput label="N' de Pedido" icon={Hash} value={formData.n_pedido} onChange={v => handleInputChange('n_pedido', v)}/>
            </div>
            <div className="lg:col-span-2 space-y-3">
               <StableInput label="Fecha" icon={Calendar} type="date" value={formData.fecha} onChange={v => handleInputChange('fecha', v)}/>
                <button 
                    onClick={handleCaptureLocation} 
                    disabled={locationStatus === 'loading'} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 flex items-center justify-center gap-3 font-bold text-slate-700 shadow-sm text-sm hover:border-amber-500 transition-colors disabled:opacity-50"
                >
                    {locationStatus === 'loading' && <Loader2 className="animate-spin text-amber-500" size={16}/>}
                    {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 className="text-green-500" size={16}/> : <MapPin className="text-slate-400" size={16}/>)}
                    <span>{formData.location ? `${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación'}</span>
                </button>
               <StableInput label="Técnicos" icon={User} value={formData.tecnicos} onChange={v => handleInputChange('tecnicos', v)}/>
               <StableInput label="H. Asistencia" icon={Clock} value={formData.h_asistencia} onChange={v => handleInputChange('h_asistencia', v)}/>
               <StableInput label="Tipo de Servicio" icon={Type} value={formData.tipo_servicio} onChange={v => handleInputChange('tipo_servicio', v)}/>
               <StableInput label="KMs." icon={Car} type="number" value={formData.kms} onChange={v => handleInputChange('kms', v)}/>
               <StableInput label="Dieta (€)" icon={Euro} type="number" value={formData.dieta} onChange={v => handleInputChange('dieta', v)}/>
               <div className="flex items-center gap-2 pt-2">
                 <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={formData.media_dieta} onChange={e => handleInputChange('media_dieta', e.target.checked)} className="form-checkbox h-5 w-5 text-amber-600 rounded" />
                    1/2 Dieta
                 </label>
                 {formData.media_dieta && <StableInput label="Cantidad" type="number" value={formData.media_dieta_cantidad} onChange={v => handleInputChange('media_dieta_cantidad', v)}/>}
               </div>
            </div>
         </div>
      </section>
      
      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Settings className="text-amber-500"/> Parámetros Técnicos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StableInput icon={Clock} label="Horas" value={formData.parametrosTecnicos.horas} onChange={v => handleNestedInputChange('parametrosTecnicos', 'horas', v)} />
              <StableInput icon={Gauge} label="Presión Aceite" value={formData.parametrosTecnicos.presionAceite} onChange={v => handleNestedInputChange('parametrosTecnicos', 'presionAceite', v)} />
              <StableInput icon={Zap} label="Tensión" value={formData.parametrosTecnicos.tension} onChange={v => handleNestedInputChange('parametrosTecnicos', 'tension', v)} />
              <StableInput icon={Thermometer} label="T' (°C):" value={formData.parametrosTecnicos.temperatura} onChange={v => handleNestedInputChange('parametrosTecnicos', 'temperatura', v)} />
              <StableInput icon={Droplets} label="Nivel Combustible (%):" value={formData.parametrosTecnicos.nivelCombustible} onChange={v => handleNestedInputChange('parametrosTecnicos', 'nivelCombustible', v)} />
              <StableInput icon={Wind} label="Frecuencia (Hz):" value={formData.parametrosTecnicos.frecuencia} onChange={v => handleNestedInputChange('parametrosTecnicos', 'frecuencia', v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <StableInput icon={Battery} label="Tensión de baterías (V):" value={formData.parametrosTecnicos.tensionBaterias} onChange={v => handleNestedInputChange('parametrosTecnicos', 'tensionBaterias', v)} />
              </div>
          </div>
      </section>

      <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Zap className="text-amber-500"/> Potencia con carga</h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-4 items-end">
            <div className="md:col-span-3">
              <StableInput label="Potencia con carga" value={formData.potenciaConCarga.potencia} onChange={v => handleNestedInputChange('potenciaConCarga', 'potencia', v)} />
            </div>
             <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Tensión</h4>
                <div className="grid grid-cols-3 gap-2">
                    <LoadTestInput label="RS:" value={formData.potenciaConCarga.tensionRS} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionRS', v)} />
                    <LoadTestInput label="ST:" value={formData.potenciaConCarga.tensionST} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionST', v)} />
                    <LoadTestInput label="RT:" value={formData.potenciaConCarga.tensionRT} onChange={v => handleNestedInputChange('potenciaConCarga', 'tensionRT', v)} />
                </div>
            </div>
            <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Intensidad</h4>
                 <div className="grid grid-cols-3 gap-2">
                    <LoadTestInput label="R:" value={formData.potenciaConCarga.intensidadR} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadR', v)} />
                    <LoadTestInput label="S:" value={formData.potenciaConCarga.intensidadS} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadS', v)} />
                    <LoadTestInput label="T:" value={formData.potenciaConCarga.intensidadT} onChange={v => handleNestedInputChange('potenciaConCarga', 'intensidadT', v)} />
                </div>
            </div>
            <div className="md:col-span-3 space-y-4">
                <h4 className="text-sm font-bold text-center text-slate-500">Potencia (kW)</h4>
                 <div className="">
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
            <div>
              <SignaturePad title="Firma del Inspector" onSignatureEnd={setInspectorSignature} />
              <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
            </div>
            <div>
              <SignaturePad title="Conforme Cliente" onSignatureEnd={setClientSignature} />
               <div className="mt-2">
                <StableInput label="" icon={User} value={formData.recibidoPor} onChange={v => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
              </div>
            </div>
        </div>
    </section>

    <div className="flex flex-col md:flex-row gap-4">
        <button onClick={handlePdfAction} disabled={saving} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
            {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
            {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
        </button>
        <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-6 bg-slate-900 text-white rounded-2xl font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
          {saving ? <Loader2 className="animate-spin text-amber-500" /> : isSaved ? <CheckCircle2 className="text-amber-500" /> : <Save className="text-amber-500" />}
          {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR ALBARÁN'}
        </button>
    </div>
    </main>
    </div>
  );
}
