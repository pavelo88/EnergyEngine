'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap, Wrench, Camera } from 'lucide-react';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { INITIAL_FORM_DATA } from '../../lib/form-constants';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local'; // Corregido: alias para evitar colisión con useFirestore
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';

// 1. Checklist específico y reducido para "Revisión Básica" (Sin filtros ni correas)
const BASIC_REVISION_CHECKLIST = {
  "INSPECCIÓN EN EL MOTOR": ["Nivel de lubricante", "Indicador nivel refrigerante", "Correa del ventilador", "Filtro de combustible y prefiltro", "Filtro de aire", "Filtro de aceite y prefiltro de aceite", "Tubo de escape", "Circuito de refrigeración", "Circuito de lubricación", "Baterías", "Motor de arranque"],
  "INSPECCION EN EL ALTERNADOR": ["Placas de los bornes", "Regulador eléctrico", "Colector", "Rodamiento", "Ventilación", "Escobillas", "Maniobra"],
  "INSPECCION EQUIPO ELECTRICO": ["Aparatos de medida", "Pilotos", "Mantenedor de baterías", "Interruptor general", "Resistencia de caldeo", "Contactores", "Reles auxiliares", "Apriete bornes", "Cableado"]
};

const StableInput = React.memo(({ label, value, onChange, icon: Icon, type = "text", placeholder = '' }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16}/>}
      <input 
        type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-slate-50 border-2 border-slate-100 rounded-lg p-3 ${Icon ? 'pl-11' : ''} outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-700 shadow-sm text-sm`}
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

    // Márgenes Globales estrictos
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 40;
    const bottomMargin = 20;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const globalMargin = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };

    let currentY = topMargin;

    // 1. Título Principal
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`REVISIÓN BÁSICA - Nº: ${finalID}`, leftMargin, currentY);
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
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 3. Tabla Checklist (Reducida)
    const colWidth = 28; 
    autoTable(doc, {
        startY: currentY,
        head: [['INSPECCIÓN / ESTADO', 'OK', 'DEFECTUOSO', 'CAMBIO']],
        body: Object.entries(BASIC_REVISION_CHECKLIST).flatMap(([section, items]) => {
            const sectionRows: any[] = [[{ content: section, colSpan: 4, styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#000', halign: 'left' }}]];
            (items as string[]).forEach(item => {
                sectionRows.push([
                    item,
                    report.checklist?.[item] === 'OK' ? 'X' : '',
                    report.checklist?.[item] === 'DEFECTUOSO' ? 'X' : '',
                    report.checklist?.[item] === 'CAMBIO' ? 'X' : '',
                ]);
            });
            return sectionRows;
        }),
        theme: 'grid',
        didParseCell: function (data) {
          const item = (data.row.raw as any[])[0];
          const status = report.checklist?.[item as string];
          if (status === 'DEFECTUOSO') {
            data.cell.styles.fillColor = '#fee2e2'; // red-100
          }
          if (status === 'CAMBIO') {
            data.cell.styles.fillColor = '#dcfce7'; // green-100
          }
        }, 
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center' },
        headStyles: { fillColor: darkColor, textColor: '#fff', halign: 'center' },
        columnStyles: { 
            0: { halign: 'left' },
            1: { cellWidth: colWidth },
            2: { cellWidth: colWidth },
            3: { cellWidth: colWidth },
        },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    if (currentY + 50 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    // 4. Tabla de Recambios (Nueva)
    autoTable(doc, {
        startY: currentY,
        head: [['RECAMBIOS Y MATERIALES', 'REFERENCIA / CANTIDAD']],
        body: [
            ['F.A. (Filtro de Aceite)', report.recambios?.fa || ''],
            ['F.C. (Filtro de Combustible)', report.recambios?.fc || ''],
            ['F.AR. (Filtro de Aire)', report.recambios?.far || ''],
            ['F.AG. (Filtro de Agua)', report.recambios?.fag || ''],
            ['L.AC. (Litros de Aceite)', report.recambios?.lac || ''],
            ['L.ANT. (Litros de Anticongelante)', report.recambios?.lant || ''],
            ['BAT. (Baterías)', report.recambios?.bat || ''],
            ['REST. (Resto / Otros)', report.recambios?.rest || ''],
        ],
        theme: 'grid', 
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: darkColor, textColor: '#fff' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    if (currentY + 60 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    // 5. Tabla de Pruebas
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

    // 6. OBSERVACIONES
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

    // 7. FIRMAS
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
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawPdfHeader(doc);
        drawPdfFooter(doc, i, totalPages);
    }

    return doc;
};

export default function RevisionBasicaForm({ initialData, aiData }: { initialData?: any, aiData?: ProcessDictationOutput | null }) {
  const { user } = useUser();
  const firestore = useFirestore(); // Renombrado para evitar conflicto con local db
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  const [images, setImages] = useState<File[]>([]);
  
  // Extendemos INITIAL_FORM_DATA para incluir los recambios
  const [formData, setFormData] = useState<any>({
    ...INITIAL_FORM_DATA,
    formType: 'revision-basica',
    recambios: {
        fa: '', fc: '', far: '', fag: '', lac: '', lant: '', bat: '', rest: ''
    }
  });
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('energy_engine_signature');
    }
    return null;
  });
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (user && user.email && firestore) {
        getDoc(doc(firestore, 'usuarios', user.email)).then(snap => {
            if (snap.exists()) setInspectorName(snap.data().nombre);
            else setInspectorName(user.email || 'Técnico');
        }).catch((e: any) => console.error(e));
    }
  }, [user, firestore]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
          ...prev,
          cliente: initialData.clienteNombre || prev.cliente,
          instalacion: initialData.instalacion || prev.instalacion,
          direccion: initialData.direccion || prev.direccion,
          motor: initialData.modelo || prev.motor,
          modelo: initialData.n_motor || prev.modelo,
          n_motor: initialData.n_motor || prev.n_motor,
          n_grupo: initialData.n_grupo || prev.n_grupo,
          potencia: initialData.potencia || prev.potencia,
          observaciones: initialData.descripcion || prev.observaciones,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (aiData) {
      setFormData((prev: any) => {
          const newChecklist = { ...prev.checklist, ...aiData.checklist_updates };
          if (aiData.all_ok) {
            Object.values(BASIC_REVISION_CHECKLIST).flat().forEach(item => {
              if (!newChecklist[item]) newChecklist[item] = 'OK';
            });
          }

          const recambiosUpdates = { ...prev.recambios };
          const checklistUpdates = aiData.checklist_updates || {};
          const recambiosMapping: { [key: string]: keyof typeof recambiosUpdates } = {
              'Filtro de aceite': 'fa',
              'Filtro de combustible': 'fc',
              'Filtro de aire': 'far',
              'Filtro de agua': 'fag',
              'Aceite': 'lac',
              'Anticongelante': 'lant',
              'Baterías': 'bat'
          };

          for (const [item, status] of Object.entries(checklistUpdates)) {
              const mappedKey = Object.keys(recambiosMapping).find(key => item.toLowerCase().includes(key.toLowerCase()));
              if (mappedKey && (status === 'CMB' || status === 'CAMBIO')) {
                  const formKey = recambiosMapping[mappedKey];
                  if (!recambiosUpdates[formKey]) { 
                      recambiosUpdates[formKey] = 'Cambiado';
                  }
              }
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
            recambios: recambiosUpdates,
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
    setFormData((prev: any) => ({ ...prev, checklist: { ...prev.checklist, [item]: status } }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error de Geolocalización', description: 'Tu navegador no soporta esta función.' });
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
        toast({ variant: 'destructive', title: 'Ubicación denegada', description: 'Asegúrate de tener los permisos de localización activados.' });
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
            doc.save(`Revision_Basica_${savedDocId}.pdf`);
        } else {
            setPreviewPdfUrl(doc.output('datauristring'));
        }
    }
  };

  const handleSave = async () => {
    if (!firestore || !user || !user.email) {
        toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Por favor, recarga la página.' });
        return;
    }
    if (isSaved) return;

    if (!formData.cliente || !formData.instalacion || !formData.location || !inspectorSignature || !clientSignature) {
      toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Cliente, instalación, localización y ambas firmas son obligatorios.' });
      return;
    }

    setSaving(true);
    
    const updateOriginalJobStatus = async (jobId: string) => {
      if (isOnline && firestore) {
          try {
              const jobRef = doc(firestore, 'trabajos', jobId);
              await updateDoc(jobRef, { estado: 'Completado' });
          } catch (updateError) {
              console.error(`Failed to update job ${jobId} status:`, updateError);
              toast({
                  variant: "destructive",
                  title: "Error de Actualización",
                  description: `No se pudo marcar el trabajo ${jobId} como completado.`,
              });
          }
      }
    };

    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
        const localData = { 
          ...formData, 
          formType: 'revision-basica',
          originalJobId: initialData?.id || null
        };
        if (!synced) {
            (localData as any).images = images;
            (localData as any).inspectorSignature = inspectorSignature;
            (localData as any).clientSignature = clientSignature;
        }

        await dbLocal.hojas_trabajo.add({
            firebaseId: firebaseId || '',
            synced,
            data: localData,
            createdAt: new Date(),
        });
        if (!synced) {
            toast({ title: 'Guardado localmente (sin conexión)', description: 'El informe se sincronizará cuando vuelvas a tener conexión.' });
        } else {
            toast({ title: '¡Guardado y Sincronizado!', description: `La revisión básica ha sido guardada con el ID: ${firebaseId}` });
        }
    };

    if (isOnline) {
      try {
          const formType = 'revision-basica';
          const trabajosRef = collection(firestore, 'trabajos');
          const qTrabajos = query(trabajosRef, where('formType', '==', formType));
          const trabajosSnapshot = await getDocs(qTrabajos);
          const sequentialNumber = (trabajosSnapshot.size + 1).toString().padStart(3, '0');
          const year = new Date().getFullYear();
          const docId = `BAS-${year}-${sequentialNumber}`;

          const storage = getStorage();
          const imageUrls = await Promise.all(
              images.map(async (image) => {
              const imageRef = ref(storage, `informes/${docId}/${image.name}`);
              await uploadBytes(imageRef, image);
              return await getDownloadURL(imageRef);
              })
          );
          
          // Corrección Firmas Firebase Storage
          const inspectorRef = ref(storage, `firmas/${docId}/inspector.png`);
          await uploadString(inspectorRef, inspectorSignature!, 'data_url');
          const inspectorSignatureUrl = await getDownloadURL(inspectorRef);

          const clientRef = ref(storage, `firmas/${docId}/cliente.png`);
          await uploadString(clientRef, clientSignature!, 'data_url');
          const clientSignatureUrl = await getDownloadURL(clientRef);

          const docData = { 
              ...formData,
              imageUrls,
              inspectorSignatureUrl, 
              clientSignatureUrl, 
              tecnicoId: user.email, 
              tecnicoNombre: inspectorName, 
              fecha_creacion: Timestamp.now(), 
              formType,
              id: docId,
              estado: 'Completado',
          };
          await setDoc(doc(firestore, 'trabajos', docId), docData);

          if (initialData?.id) {
            await updateOriginalJobStatus(initialData.id);
          }

          await saveDataToLocal(true, docId);
          setSavedDocId(docId);
          setIsSaved(true);

      } catch (e: any) { 
        console.error("Error saving document:", e); 
        await saveDataToLocal(false);
      }
    } else {
      await saveDataToLocal(false);
    }
    setSaving(false);
  };
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-slate-50 min-h-screen">
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => !isOpen && setPreviewPdfUrl(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Vista Previa de Revisión Básica</DialogTitle>
                    <DialogDescription>Revisa el borrador. Este NO es el documento final.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-slate-200 p-4">
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full shadow-lg" title="PDF Preview" />}
                </div>
            </DialogContent>
        </Dialog>
        
        <main className="p-4 md:p-6 space-y-8 pb-40">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 border-l-4 border-primary pl-4 uppercase tracking-tighter">Revisión Básica</h2>
            </div>

            {/* --- DATOS GENERALES --- */}
            <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
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
                        className={`w-full bg-slate-50 border-2 rounded-lg p-3 flex items-center justify-center gap-3 font-bold shadow-sm text-sm transition-colors disabled:opacity-50 ${formData.location ? 'border-green-500 text-green-600' : 'border-slate-100 text-slate-700 hover:border-primary'}`}
                    >
                        {locationStatus === 'loading' && <Loader2 className="animate-spin text-primary" size={16}/>}
                        {locationStatus !== 'loading' && (formData.location ? <CheckCircle2 size={16}/> : <MapPin size={16}/>)}
                        <span>{formData.location ? `Ubicación Capturada: ${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : 'Capturar Ubicación (Obligatorio)'}</span>
                    </button>
                </div>
            </section>
            
            {/* --- CHECKLISTS --- */}
            {Object.entries(BASIC_REVISION_CHECKLIST).map(([section, items]) => (
                <section key={section} className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-4 border border-slate-100">
                    <h3 className="font-bold text-slate-500">{section}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {(items as string[]).map(it => (
                        <div key={it} className={`p-4 rounded-lg flex justify-between items-center transition-all border ${formData.checklist[it] ? 'bg-primary/10 border-primary/20' : 'bg-slate-50/50 border-slate-100'}`}>
                            <span className="text-lg font-bold text-slate-700">{it}</span>
                            <div className="flex gap-1">
                            {["OK", "DEFECTUOSO", "CAMBIO"].map(st => (
                                <button key={st} onClick={() => handleChecklistChange(it, st)} className={`w-20 h-8 rounded-lg text-[10px] font-black border-2 transition-all ${formData.checklist[it] === st ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'}`}>{st}</button>
                            ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* --- RECAMBIOS Y MATERIALES --- */}
            <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
                <h3 className="font-bold text-slate-500">Recambios y Materiales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StableInput icon={Wrench} label="F.A. (Filtro Aceite)" value={formData.recambios.fa} onChange={(v: string) => handleNestedChange('recambios', 'fa', v)} />
                    <StableInput icon={Wrench} label="F.C. (Filtro Combustible)" value={formData.recambios.fc} onChange={(v: string) => handleNestedChange('recambios', 'fc', v)} />
                    <StableInput icon={Wrench} label="F.AR. (Filtro Aire)" value={formData.recambios.far} onChange={(v: string) => handleNestedChange('recambios', 'far', v)} />
                    <StableInput icon={Wrench} label="F.AG. (Filtro Agua)" value={formData.recambios.fag} onChange={(v: string) => handleNestedChange('recambios', 'fag', v)} />
                    <StableInput icon={Droplets} label="L.AC. (Litros Aceite)" value={formData.recambios.lac} onChange={(v: string) => handleNestedChange('recambios', 'lac', v)} />
                    <StableInput icon={Droplets} label="L.ANT. (Litros Anticong.)" value={formData.recambios.lant} onChange={(v: string) => handleNestedChange('recambios', 'lant', v)} />
                    <StableInput icon={Battery} label="BAT. (Baterías)" value={formData.recambios.bat} onChange={(v: string) => handleNestedChange('recambios', 'bat', v)} />
                    <StableInput icon={Wrench} label="REST. (Otros)" value={formData.recambios.rest} onChange={(v: string) => handleNestedChange('recambios', 'rest', v)} />
                </div>
            </section>

            {/* --- PRUEBAS --- */}
            <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
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

             <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Camera className="text-primary"/> Evidencia Fotográfica</h2>
                <div>
                    <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-100 border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:bg-slate-200 transition-colors">
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
            <section className="bg-white p-6 md:p-10 rounded-lg shadow-sm space-y-6 border border-slate-100">
                <h3 className="font-bold text-slate-500">Observaciones</h3>
                <textarea className="w-full h-24 bg-slate-50 border-2 border-slate-100 rounded-lg p-4 resize-none" placeholder="Añade tus observaciones aquí..." value={formData.observaciones} onChange={e => handleInputChange('observaciones', e.target.value)}/>
                <div className="grid md:grid-cols-2 gap-8 items-start pt-6">
                    <div>
                        <SignaturePad title="Firma del Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
                        <p className="text-center font-bold mt-2 text-slate-700">{inspectorName}</p>
                    </div>
                    <div>
                        <SignaturePad title="Firma del Cliente" signature={clientSignature} onSignatureEnd={setClientSignature} />
                        <div className="mt-2">
                        <StableInput label="" icon={User} value={formData.recibidoPor} onChange={(v: string) => handleInputChange('recibidoPor', v)} placeholder="Nombre del receptor"/>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ACCIONES --- */}
            <div className="flex flex-col md:flex-row gap-4">
                <button onClick={handlePdfAction} disabled={saving} className="w-full p-6 bg-white text-slate-900 border-2 border-slate-200 rounded-lg font-bold text-base shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-all hover:border-slate-400 disabled:opacity-50">
                    {isSaved ? <Printer size={20} /> : <FileSearch size={20} />}
                    {isSaved ? 'IMPRIMIR PDF' : 'VISTA PREVIA'}
                </button>
                <button onClick={handleSave} disabled={saving || isSaved} className="w-full p-6 bg-slate-900 text-white rounded-lg font-black text-base shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700">
                    {saving ? <Loader2 className="animate-spin text-primary" /> : isSaved ? <CheckCircle2 className="text-primary" /> : <Save className="text-primary" />}
                    {saving ? 'GUARDANDO...' : isSaved ? 'GUARDADO' : 'GUARDAR REVISIÓN'}
                </button>
            </div>
        </main>
    </div>
  );
}