'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap, Wrench, Camera } from 'lucide-react';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { INITIAL_FORM_DATA } from '../../lib/form-constants';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import logoLight from '@/app/logo.png';

const SIMPLIFIED_CHECKLIST_ITEMS = [
    "Filtro de Aceite",
    "Filtro de Combustible",
    "Filtro de Aire",
    "Filtro de Agua",
    "Litros de Aceite",
    "Litros de Anticongelante",
    "Baterías",
    "Otros"
];

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16}/>}
      <input 
        type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 ${Icon ? 'pl-11' : ''} outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm`}
      />
    </div>
  </div>
));

const LoadTestInput = React.memo(({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[9px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-100 border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm text-center"
        />
    </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
    const doc = new jsPDF();
    const finalID = reportId || 'BORRADOR';
    const darkColor = '#0f172a';
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Márgenes Globales
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 40;
    const bottomMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const globalMargin = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };

    let currentY = topMargin;

    // 1. Título
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`INFORME SIMPLIFICADO - Nº: ${finalID}`, leftMargin, currentY);
    currentY += 6;

    // 2. Datos Generales
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
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 3. Checklist de Recambios
    autoTable(doc, {
        startY: currentY,
        head: [['RECAMBIOS Y MATERIALES', 'OK', 'DEFECTUOSO', 'CAMBIO']],
        body: SIMPLIFIED_CHECKLIST_ITEMS.map(item => [
            item,
            report.recambios_checklist?.[item] === 'OK' ? 'X' : '',
            report.recambios_checklist?.[item] === 'DEFECTUOSO' ? 'X' : '',
            report.recambios_checklist?.[item] === 'CAMBIO' ? 'X' : '',
        ]),
        theme: 'grid',
        didParseCell: function (data) {
          const item = (data.row.raw as any[])[0] as string;
          const status = report.recambios_checklist?.[item];
          if (status === 'DEFECTUOSO') data.cell.styles.fillColor = '#fee2e2';
          if (status === 'CAMBIO') data.cell.styles.fillColor = '#dcfce7';
        }, 
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: darkColor, textColor: '#fff', halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 } },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    
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
        margin: globalMargin
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
    const blocks = rawText.split('\n\n');

    blocks.forEach((block: string) => {
      const text = block.replace(/\n/g, ' ').trim();
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
              margin: globalMargin,
              body: [[text]],
              theme: 'plain',
              styles: { font: 'helvetica', fontSize: 9, cellPadding: 0, halign: 'justify', textColor: darkColor },
              columnStyles: { 0: { cellWidth: contentWidth } }
          });
          currentY = (doc as any).lastAutoTable.finalY + 4;
      }
    });

    currentY += 8;
    
     // 6. Firmas
    const signatureBlockHeight = 45;
    if (currentY + signatureBlockHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (report.inspectorSignatureUrl) doc.addImage(report.inspectorSignatureUrl, 'PNG', 25, currentY, 60, 25);
    doc.line(25, currentY + 25, 85, currentY + 25);
    doc.text("Firma técnico:", 25, currentY + 30);
    doc.text(inspectorName || '', 25, currentY + 35);

    if (report.clientSignatureUrl) doc.addImage(report.clientSignatureUrl, 'PNG', 125, currentY, 60, 25);
    doc.line(125, currentY + 25, 185, currentY + 25);
    doc.text("Conforme cliente:", 125, currentY + 30);
    doc.text(report.recibidoPor || '', 125, currentY + 35);

// 7. DIBUJAR ENCABEZADOS Y PIES DE PÁGINA GLOBALES
const drawHeader = () => {
  const logoX = leftMargin;
  const logoY = 3; // ¡Mucho más arriba! (antes 10)
  const logoWidth = 20; // Tamaño del logo ligeramente reducido para mayor elegancia
  const logoHeight = 20;
  
  // --- 1. DIBUJAR EL FONDO VERDE PARA TODO EL ENCABEZADO ---
  // Establece el color de relleno verde. He usado un verde de contraste (RGB).
  doc.setFillColor(39, 180, 96); // Un verde esmeralda para el fondo
  // Dibuja un rectángulo lleno (modo 'F') que cubre todo el ancho y una altura de 25mm.
  doc.rect(0, 0, pageWidth, 26, 'F'); 

  // --- 2. DIBUJAR EL LOGO ---
  doc.addImage(logoLight.src, 'PNG', logoX, logoY, logoWidth, logoHeight);

  // --- 3. DIBUJAR EL TEXTO DE LA EMPRESA ---
  const textX = logoX + logoWidth + 6; // Margen de 4mm tras el logo
  const textYStart = logoY + 9; // Ajuste vertical para alinearse con el logo

  doc.setFont('helvetica', 'bold');
  
  // Línea 1: "energy engine" en BLANCO
  doc.setFontSize(18); // Ligeramente más grande para que sea el título principal
  doc.setTextColor(255, 255, 255); // Blanco puro
  doc.text("energy engine", textX, textYStart);
  
  // Línea 2: "GRUPOS ELECTRÓGENOS" en GRIS CLARO
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220); // Gris muy claro
  doc.text("GRUPOS ELECTRÓGENOS", textX, textYStart + 6);
  
  // --- 4. DIBUJAR LA INFORMACIÓN DE CONTACTO A LA DERECHA ---
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220); // Gris muy claro para los links

  const rightTextX = pageWidth - rightMargin;
  
  // Subimos las coordenadas Y de los textos de la derecha para alinearlos con el logo superior.
  // URL arriba
  doc.text("https://www.energyengine.es", rightTextX, logoY + 8, { align: 'right' });
  // Teléfono en medio
  doc.text("Tel: 92 515 43 53", rightTextX, logoY + 13, { align: 'right' });
  // Email abajo
  doc.text("serviciotecnico@energyengine.es", rightTextX, logoY + 16, { align: 'right' });
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


export default function InformeSimplificadoForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const db = useFirestore();
  const [inspectorName, setInspectorName] = useState('');
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState<any>({
    ...INITIAL_FORM_DATA,
    recambios_checklist: {},
  });
    
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
        }).catch((e: any) => console.error(e));
    }
  }, [user, db]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
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

  useEffect(() => {
    if (aiData) {
      setFormData((prev: any) => {
          const newRecambiosChecklist = { ...prev.recambios_checklist, ...aiData.checklist_updates };
          if (aiData.all_ok) {
            SIMPLIFIED_CHECKLIST_ITEMS.forEach(item => {
              if (!newRecambiosChecklist[item]) {
                newRecambiosChecklist[item] = 'OK';
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
            recambios_checklist: newRecambiosChecklist,
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

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({...prev, [field]: value}));
  };
  
  const handleNestedChange = (section: string, field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [section]: { ...(prev as any)[section], [field]: value } }));
  };

  const handleChecklistChange = (item: string, status: string) => {
    setFormData((prev: any) => ({ ...prev, recambios_checklist: { ...prev.recambios_checklist, [item]: status } }));
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
        alert("No se pudo obtener la ubicación. Por favor, asegúrate de que los permisos de localización están activados para esta página en los ajustes de tu navegador e inténtalo de nuevo.");
        setLocationStatus('error');
      }
    );
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
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
            doc.save(`Informe_Simplificado_${savedDocId}.pdf`);
        } else {
            setPreviewPdfUrl(doc.output('datauristring'));
        }
    }
  };

  const handleSave = async () => {
    if (!db || !user) return alert("Error de autenticación.");
    if (isSaved) return;

    // VALIDATION
    if (!formData.cliente || !formData.instalacion || !formData.location || !inspectorSignature || !clientSignature) {
      alert("Es obligatorio rellenar Cliente, Instalación, Localización y ambas Firmas para guardar.");
      return;
    }

    setSaving(true);
    
    try {
        // AUTO-CREATE CLIENT
        const clientesRef = collection(db, "clientes");
        const q = query(clientesRef, where("nombre", "==", formData.cliente.trim()));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty && formData.cliente.trim().length > 0) {
            await addDoc(clientesRef, {
                nombre: formData.cliente.trim(),
                direccion: formData.direccion || '',
                email: '',
                telefono: ''
            });
        }

        const storage = getStorage();
        const year = new Date().getFullYear();
        const trabajosRef = collection(db, 'trabajos');
        const qTrabajos = query(trabajosRef, where('formType', '==', 'informe-simplificado'));
        const trabajosSnapshot = await getDocs(qTrabajos);
        const sequentialNumber = (trabajosSnapshot.size + 1).toString().padStart(3, '0');
        const docId = `IS-${year}-${sequentialNumber}`;

        const imageUrls = await Promise.all(
            images.map(async (image) => {
            const imageRef = ref(storage, `informes/${docId}/${image.name}`);
            await uploadBytes(imageRef, image);
            return await getDownloadURL(imageRef);
            })
        );

      const docData = { 
          ...formData,
          imageUrls,
          inspectorSignatureUrl: inspectorSignature, 
          clientSignatureUrl: clientSignature, 
          tecnicoId: user.uid, 
          tecnicoNombre: inspectorName, 
          fecha_guardado: Timestamp.now(), 
          formType: 'informe-simplificado',
          id: docId,
          estado: 'Completado',
      };
      await setDoc(doc(db, 'trabajos', docId), docData);
      setSavedDocId(docId);
      setIsSaved(true);
      alert(`Informe Simplificado guardado con éxito. ID: ${docId}`);
    } catch (e: any) { 
      console.error("Error saving document:", e); 
      alert("Error al guardar."); 
    }
    finally { setSaving(false); }
  };
  
  return (
    <div className="animate-in fade-in w-full bg-slate-50 min-h-screen">
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Vista Previa de Informe Simplificado</DialogTitle>
                    <DialogDescription>Revisa el borrador. Este NO es el documento final.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-slate-200 p-4">
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
                </div>
            </DialogContent>
        </Dialog>
        
        <main className="p-4 md:p-6 space-y-8 pb-40">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe Simplificado</h2>
            </div>

            {/* --- DATOS GENERALES --- */}
            <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
                <h3 className="font-bold text-slate-500">Datos Generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StableInput label="Cliente" icon={Users} value={formData.cliente} onChange={(v: string) => handleInputChange('cliente', v)}/>
                    <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={(v: string) => handleInputChange('instalacion', v)}/>
                    <StableInput label="Dirección" icon={MapPin} value={formData.direccion} onChange={(v: string) => handleInputChange('direccion', v)}/>
                    <StableInput label="Fecha Revisión" icon={Calendar} type="date" value={formData.fecha_revision} onChange={(v: string) => handleInputChange('fecha_revision', v)}/>
                    <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: string) => handleInputChange('motor', v)}/>
                    <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={(v: string) => handleInputChange('modelo', v)}/>
                    <StableInput label="Nº Motor" icon={Hash} value={formData.n_motor} onChange={(v: string) => handleInputChange('n_motor', v)}/>
                    <StableInput label="Nº Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: string) => handleInputChange('n_grupo', v)}/>
                    <StableInput label="Potencia" icon={Zap} value={formData.potencia} onChange={(v: string) => handleInputChange('potencia', v)}/>
                    <button 
                        onClick={handleCaptureLocation} 
                        disabled={locationStatus === 'loading'} 
                        className={`w-full bg-slate-50 border-2 rounded-xl p-3 flex items-center justify-center gap-3 font-bold shadow-sm text-sm transition-colors disabled:opacity-50 ${formData.location ? 'border-green-500 text-green-600' : 'border-slate-100 text-slate-700 hover:border-primary'}`}
                    >
                        {locationStatus === 'loading' && <Loader2 className="animate-spin text-primary" size={16}/>}
                        {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 size={16}/> : <MapPin size={16}/>)}
                        <span>{formData.location ? `Ubicación Capturada: ${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación (Obligatorio)'}</span>
                    </button>
                </div>
            </section>
            
            {/* --- CHECKLIST DE RECAMBIOS --- */}
            <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <h3 className="font-bold text-slate-500">Recambios y Materiales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {SIMPLIFIED_CHECKLIST_ITEMS.map(it => (
                    <div key={it} className={`p-4 rounded-xl flex justify-between items-center transition-all border ${formData.recambios_checklist[it] ? 'bg-primary/10 border-primary/20' : 'bg-slate-50/50 border-slate-100'}`}>
                        <span className="text-lg font-bold text-slate-700">{it}</span>
                        <div className="flex gap-1">
                        {["OK", "DEFECTUOSO", "CAMBIO"].map(st => (
                            <button key={st} onClick={() => handleChecklistChange(it, st)} className={`w-20 h-8 rounded-lg text-[10px] font-black border-2 transition-all ${formData.recambios_checklist[it] === st ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'}`}>{st}</button>
                        ))}
                        </div>
                    </div>
                    ))}
                </div>
            </section>

            {/* --- PRUEBAS --- */}
            <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
                <h3 className="font-bold text-slate-500">Datos de Pruebas y Carga</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StableInput icon={Clock} label="Horas" value={formData.datos_pruebas.horas} onChange={(v: string) => handleNestedChange('datos_pruebas', 'horas', v)} />
                    <StableInput icon={Gauge} label="Presión Aceite" value={formData.datos_pruebas.presion} onChange={(v: string) => handleNestedChange('datos_pruebas', 'presion', v)} />
                    <StableInput icon={Thermometer} label="Temperatura" value={formData.datos_pruebas.temperatura} onChange={(v: string) => handleNestedChange('datos_pruebas', 'temperatura', v)} />
                    <StableInput icon={Droplets} label="Nivel Combustible" value={formData.datos_pruebas.nivel_combustible} onChange={(v: string) => handleNestedChange('datos_pruebas', 'nivel_combustible', v)} />
                    <StableInput icon={Zap} label="Tensión Alternador" value={formData.datos_pruebas.tension_alternador} onChange={(v: string) => handleNestedChange('datos_pruebas', 'tension_alternador', v)} />
                    <StableInput icon={Wind} label="Frecuencia" value={formData.datos_pruebas.frecuencia} onChange={(v: string) => handleNestedChange('datos_pruebas', 'frecuencia', v)} />
                    <StableInput icon={Battery} label="Carga Baterías" value={formData.datos_pruebas.carga_baterias} onChange={(v: string) => handleNestedChange('datos_pruebas', 'carga_baterias', v)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4">
                    <LoadTestInput label="Tensión RS" value={formData.pruebas_carga.tension_rs} onChange={(v: string) => handleNestedChange('pruebas_carga', 'tension_rs', v)} />
                    <LoadTestInput label="Tensión ST" value={formData.pruebas_carga.tension_st} onChange={(v: string) => handleNestedChange('pruebas_carga', 'tension_st', v)} />
                    <LoadTestInput label="Tensión RT" value={formData.pruebas_carga.tension_rt} onChange={(v: string) => handleNestedChange('pruebas_carga', 'tension_rt', v)} />
                    <LoadTestInput label="Intensidad R" value={formData.pruebas_carga.intensidad_r} onChange={(v: string) => handleNestedChange('pruebas_carga', 'intensidad_r', v)} />
                    <LoadTestInput label="Intensidad S" value={formData.pruebas_carga.intensidad_s} onChange={(v: string) => handleNestedChange('pruebas_carga', 'intensidad_s', v)} />
                    <LoadTestInput label="Intensidad T" value={formData.pruebas_carga.intensidad_t} onChange={(v: string) => handleNestedChange('pruebas_carga', 'intensidad_t', v)} />
                    <LoadTestInput label="Potencia kW" value={formData.pruebas_carga.potencia_kw} onChange={(v: string) => handleNestedChange('pruebas_carga', 'potencia_kw', v)} />
                </div>
            </section>
            
             <section className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Camera className="text-primary"/> Evidencia Fotográfica</h2>
                <div>
                    <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-200 transition-colors">
                        <Camera size={32} className="text-slate-400 mb-2"/>
                        <span className="font-bold text-slate-600">Adjuntar Imágenes</span>
                        <span className="text-xs text-slate-500">Toma una foto o selecciona archivos</span>
                    </label>
                    <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange}/>
                </div>
                {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {images.map((img, i) => (
                            <div key={i} className="relative aspect-square">
                                <img src={URL.createObjectURL(img)} alt={`preview ${i}`} className="w-full h-full object-cover rounded-lg"/>
                            </div>
                        ))}
                    </div>
                )}
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
                        <StableInput label="" icon={User} value={formData.recibidoPor} onChange={(v: string) => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
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
                    {saving ? <Loader2 className="animate-spin text-primary" /> : isSaved ? <CheckCircle2 className="text-primary" /> : <Save className="text-primary" />}
                    {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR INFORME'}
                </button>
            </div>
        </main>
    </div>
  );
}
