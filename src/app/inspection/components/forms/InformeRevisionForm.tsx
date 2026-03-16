
'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap, Mic, Camera } from 'lucide-react';
import { ProcessDictationOutput } from '@/ai/flows/process-dictation-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { CHECKLIST_SECTIONS, INITIAL_FORM_DATA } from '../../lib/form-constants';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';
import { useGpsRequired } from '@/hooks/use-gps-required';
import ClientSelector from '../ClientSelector';
import StableInput from '../StableInput';
import { getInspectionMode, resolveInspectorEmail } from '@/lib/inspection-mode';




const LoadTestInput = React.memo(({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[8px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" value={value || ''} onChange={(e: any) => onChange(e.target.value)}
            className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1.5 outline-none focus:border-primary focus:bg-white transition-all font-bold text-black shadow-sm text-xs text-center"
        />
    </div>
));

export const generatePDF = (report: any, inspectorName: string, reportId: string | null) => {
  const doc = new jsPDF();
  const finalID = reportId || 'BORRADOR';
  const darkColor = '#0f172a';
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 40;
  const bottomMargin = 20;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  
  const globalMargin = { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin };

  let currentY = topMargin;

  try {
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`INFORME DE REVISIÃ“N - NÂº: ${finalID}`, leftMargin, currentY);
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        body: [
            [{ content: 'CLIENTE:', styles: { fontStyle: 'bold', cellWidth: 35 } }, { content: report.clienteNombre || report.cliente || '', colSpan: 3 }],
            [{ content: 'INSTALACIÃ“N:', styles: { fontStyle: 'bold' } }, { content: report.instalacion || '', colSpan: 3 }],
            [{ content: 'DIRECCIÃ“N:', styles: { fontStyle: 'bold' } }, { content: report.direccion || '', colSpan: 3 }],
            [{ content: 'UBICACIÃ“N (LAT/LON):', styles: { fontStyle: 'bold' } }, { content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3 }],
            [{ content: 'FECHA REVISIÃ“N:', styles: { fontStyle: 'bold' } }, report.fecha_revision || '', { content: 'POTENCIA:', styles: { fontStyle: 'bold', cellWidth: 30 } }, report.potencia || ''],
            [{ content: 'MOTOR:', styles: { fontStyle: 'bold' } }, report.motor || '', { content: 'NÂº MOTOR:', styles: { fontStyle: 'bold' } }, report.n_motor || ''],
            [{ content: 'MODELO:', styles: { fontStyle: 'bold' } }, report.modelo || '', { content: 'NÂº GRUPO:', styles: { fontStyle: 'bold' } }, report.n_grupo || ''],
        ],
        theme: 'grid', 
        styles: { fontSize: 8, cellPadding: 2 },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    const colWidth = 28; 
    autoTable(doc, {
        startY: currentY,
        head: [['INSPECCIÃ“N / ESTADO', 'OK', 'DEFECT', 'CAMBIO']],
        body: Object.entries(CHECKLIST_SECTIONS).flatMap(([section, items]) => {
            const sectionRows: any[] = [[{ content: section, colSpan: 4, styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#000', halign: 'left' }}]];
            (items as string[]).forEach(item => {
                sectionRows.push([
                    item,
                    report.checklist?.[item] === 'OK' ? 'X' : '',
                    report.checklist?.[item] === 'DEFECT' ? 'X' : '',
                    report.checklist?.[item] === 'CAMBIO' ? 'X' : '',
                ]);
            });
            return sectionRows;
        }),
        theme: 'grid', 
        didParseCell: function (data) {
            const item = (data.row.raw as any[])[0];
            const status = report.checklist?.[item as string];
            if (status === 'DEFECT') {
              data.cell.styles.fillColor = '#fee2e2'; 
            }
            if (status === 'CAMBIO') {
              data.cell.styles.fillColor = '#dcfce7'; 
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

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (currentY + 60 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    autoTable(doc, {
        startY: currentY,
        body: [
            [{ content: 'DATOS DE PRUEBAS', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' }}, { content: 'VALORES', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' }}],
            ['Horas de funcionamiento', report.datos_pruebas?.horas || ''],
            ['PresiÃ³n aceite', report.datos_pruebas?.presion || ''],
            ['Temperatura en bloque motor', report.datos_pruebas?.temperatura || ''],
            ['Nivel de deposito de combustible', report.datos_pruebas?.nivel_combustible || ''],
            ['TensiÃ³n en el alternador', report.datos_pruebas?.tension_alternador || ''],
            ['Frecuencia', report.datos_pruebas?.frecuencia || ''],
            ['Carga de baterÃ­as', report.datos_pruebas?.carga_baterias || ''],
            [{ content: 'PRUEBAS CON CARGA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' }}],
            [{ content: `TensiÃ³n: RS: ${report.pruebas_carga?.tension_rs || ''}   ST: ${report.pruebas_carga?.tension_st || ''}   RT: ${report.pruebas_carga?.tension_rt || ''}`, colSpan: 2 }],
            [{ content: `Intensidad: R: ${report.pruebas_carga?.intensidad_r || ''}   S: ${report.pruebas_carga?.intensidad_s || ''}   T: ${report.pruebas_carga?.intensidad_t || ''}`, colSpan: 2 }],
            [{ content: `Potencia: ${report.pruebas_carga?.potencia_kw || ''} kW`, colSpan: 2 }],
        ],
        theme: 'grid', 
        styles: { fontSize: 8, cellPadding: 2 },
        margin: globalMargin
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

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
    doc.text("Firma tÃ©cnico:", 25, currentY + 30);
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
  } catch (err) {
    console.error("Fallo al generar PDF de RevisiÃ³n:", err);
  }

  return doc;
};

export default function InformeRevisionForm({ initialData, aiData, onSuccess }: { initialData?: any, aiData?: ProcessDictationOutput | null, onSuccess?: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email);
  const canUseCloud = isOnline && getInspectionMode() === 'online' && !!firestore && !!user?.email;
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState<any>({ ...INITIAL_FORM_DATA, formType: 'informe-revision' });
    
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('energy_engine_signature');
    }
    return null;
  });
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const gpsRequired = useGpsRequired();

  useEffect(() => {
    if (canUseCloud && user?.email && firestore) {
      getDoc(doc(firestore, 'usuarios', user.email))
        .then(snap => {
          if (snap.exists()) setInspectorName(snap.data().nombre);
          else setInspectorName(user.email || 'Tecnico Inspector');
        })
        .catch((e: any) => {
          console.error(e);
        });
      return;
    }
    if (inspectorEmail) {
      setInspectorName(inspectorEmail.split('@')[0]);
    }
  }, [canUseCloud, inspectorEmail, user, firestore]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
          ...prev,
          cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
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
            Object.values(CHECKLIST_SECTIONS).flat().forEach(item => {
              if (!newChecklist[item]) {
                newChecklist[item] = 'OK';
              }
            });
          }

          return {
            ...prev,
            cliente: aiData.identidad?.cliente || prev.cliente,
            instalacion: aiData.identidad?.instalacion || prev.instalacion,
            direccion: aiData.identidad?.direccion || prev.direccion,
            motor: aiData.identidad?.modelo || prev.motor,
            modelo: aiData.identidad?.marca || prev.modelo,
            n_motor: aiData.identidad?.sn || prev.n_motor,
            n_grupo: aiData.identidad?.n_grupo || prev.n_grupo,
            checklist: newChecklist,
            datos_pruebas: {
                ...prev.datos_pruebas,
                ...(aiData.mediciones_generales || {})
            },
            pruebas_carga: {
                ...prev.pruebas_carga,
                ...(aiData.pruebas_carga || {})
            },
            observaciones: aiData.observations_summary || prev.observaciones
          };
      });
    }
  }, [aiData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({...prev, [field]: value}));
  };
  
  const handleNestedChange = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleChecklistChange = (item: string, status: string) => {
    setFormData((prev: any) => ({ ...prev, checklist: { ...prev.checklist, [item]: status } }));
  };

  const handleClientSelect = (client: any) => {
    setFormData((prev: any) => ({
      ...prev,
      clienteId: client.id,
      cliente: client.nombre,
      clienteNombre: client.nombre,
      direccion: client.direccion || prev.direccion,
      instalacion: client.direccion || prev.instalacion
    }));
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error de GPS', description: 'Tu dispositivo no soporta geolocalizaciÃ³n.' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
        toast({ title: 'GPS Registrado', description: 'UbicaciÃ³n capturada con Ã©xito.' });
      },
      () => {
        toast({ variant: 'destructive', title: 'Error de GPS', description: 'Por favor active los permisos de ubicaciÃ³n.' });
        setLocationStatus('error');
      }
    );
  };
  
  const handlePdfAction = (forceDownload = false, docIdOverride?: string) => {
    if (!formData.cliente || !formData.instalacion) {
        toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Complete Cliente e InstalaciÃ³n para ver la vista previa.' });
        return;
    }
    
    setPdfLoading(true);
    setTimeout(() => {
        try {
            const reportData = {
              ...formData,
              inspectorSignatureUrl: inspectorSignature,
              clientSignatureUrl: clientSignature,
            };
            const finalId = docIdOverride || (isSaved ? savedDocId : 'BORRADOR');
            const doc = generatePDF(reportData, inspectorName, finalId);
            if (isSaved || forceDownload) {
                doc.save(`Informe_Revision_${finalId}.pdf`);
            } else {
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                setPreviewPdfUrl(url);
            }
        } catch (e) {
            console.error("Error al generar vista previa:", e);
            toast({ variant: 'destructive', title: 'Error PDF', description: 'No se pudo generar el documento.' });
        } finally {
            setPdfLoading(false);
        }
    }, 500);
  };
    
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSave = async () => {
    if (!inspectorEmail) {
        toast({ variant: 'destructive', title: 'Inspector no identificado', description: 'Inicia online una vez para habilitar el modo offline.' });
        return;
    }
    if (isSaved) return;

    const missing = [];
    if (!formData.cliente) missing.push('Cliente');
    if (!formData.instalacion) missing.push('InstalaciÃ³n');
    if (gpsRequired && !formData.location) missing.push('Ubicacion GPS');
    if (!inspectorSignature) missing.push('Firma Inspector');
    if (!clientSignature) missing.push('Firma Cliente');

    if (missing.length > 0) {
      toast({ 
        variant: 'destructive', 
        title: 'Faltan Datos Obligatorios', 
        description: `Complete los siguientes campos: ${missing.join(', ')}` 
      });
      return;
    }
    setSaving(true);

    const sequence = await dbLocal.getNextSequence('informe-revision');
    const names = inspectorName.split(' ');
    const inspectorInitials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'EE';
    const docId = `IR-${inspectorInitials}-${sequence.toString().padStart(4, '0')}`;

    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
        const localData = { 
          ...formData, 
          formType: 'informe-revision',
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
        
        setSaving(false);
        setSavedDocId(firebaseId || '');
        setIsSaved(true);

        if (!synced) {
            toast({ title: 'Guardado Local', description: 'Error de red. El informe se sincronizarÃ¡ automÃ¡ticamente despuÃ©s.' });
        } else {
            toast({ title: 'Â¡Informe Guardado!', description: `Documento sincronizado con ID: ${firebaseId}` });
        }

        const shouldDownload = window.confirm("Â¡Informe guardado con Ã©xito! Â¿Desea descargar el PDF ahora?");
        if (shouldDownload) {
            handlePdfAction(true, firebaseId);
        }
        
        if (onSuccess) onSuccess();
    };

    if (canUseCloud && firestore && user?.email) {
        try {
            const storage = getStorage();

            const imageUrls = await Promise.all(images.map(async (image) => {
                const imageRef = ref(storage, `informes/${docId}/${image.name}`);
                await uploadBytes(imageRef, image);
                return await getDownloadURL(imageRef);
            }));
            
            const inspectorSignatureRef = ref(storage, `firmas/${docId}/inspector.png`);
            await uploadString(inspectorSignatureRef, inspectorSignature!, 'data_url');
            const inspectorSignatureUrl = await getDownloadURL(inspectorSignatureRef);

            const clientSignatureRef = ref(storage, `firmas/${docId}/cliente.png`);
            await uploadString(clientSignatureRef, clientSignature!, 'data_url');
            const clientSignatureUrl = await getDownloadURL(clientSignatureRef);

            const docData = {
                 ...formData, imageUrls, inspectorSignatureUrl, clientSignatureUrl,
                 inspectorId: user.email, inspectorNombre: inspectorName,
                 inspectorIds: initialData?.inspectorIds || [user.email],
                 inspectorNombres: initialData?.inspectorNombres || [inspectorName],
                 fecha_creacion: Timestamp.now(), formType: 'informe-revision', id: docId, estado: 'Completado' 
            };
            
            await setDoc(doc(firestore, 'informes', docId), docData);

            if (initialData?.id) {
              await updateDoc(doc(firestore, 'ordenes_trabajo', initialData.id), { estado: 'Completado' });
            }

            await saveDataToLocal(true, docId);

        } catch (error) {
            console.error("Fallo al guardar en la nube:", error);
            await saveDataToLocal(false, docId);
        }
    } else {
        await saveDataToLocal(false, docId);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-white min-h-screen pb-20">
       <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => {
            if (!isOpen && previewPdfUrl) {
                URL.revokeObjectURL(previewPdfUrl);
                setPreviewPdfUrl(null);
            }
        }}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border-slate-100 bg-white">
                <DialogHeader className="p-6 border-b border-slate-100 bg-white">
                    <DialogTitle className="font-black uppercase tracking-tighter text-black">Vista Previa Informe de RevisiÃ³n</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">Documento temporal generado para verificaciÃ³n de datos.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 bg-slate-100">
                    {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full border-none" title="PDF Preview" />}
                </div>
            </DialogContent>
        </Dialog>
        
        <main className="space-y-6">
            <h2 className="text-xl font-black text-black border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe de RevisiÃ³n Anual/Semestral</h2>

            {/* --- DATOS GENERALES --- */}
            <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente Base</label>
                        <div className="bg-white border border-slate-100 rounded-2xl">
                          <ClientSelector onSelect={handleClientSelect} selectedClientId={formData.clienteId} />
                        </div>
                    </div>
                    <StableInput label="InstalaciÃ³n" icon={MapPin} value={formData.instalacion} onChange={(v: any) => handleInputChange('instalacion', v)}/>
                    <StableInput label="DirecciÃ³n" icon={MapPin} value={formData.direccion} onChange={(v: any) => handleInputChange('direccion', v)}/>
                    <StableInput label="Fecha RevisiÃ³n" icon={Calendar} type="date" value={formData.fecha_revision} onChange={(v: any) => handleInputChange('fecha_revision', v)}/>
                    <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: any) => handleInputChange('motor', v)}/>
                    <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={(v: any) => handleInputChange('modelo', v)}/>
                    <StableInput label="NÂº Motor" icon={Hash} value={formData.n_motor} onChange={(v: any) => handleInputChange('n_motor', v)}/>
                    <StableInput label="NÂº Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: any) => handleInputChange('n_grupo', v)}/>
                    <StableInput label="Potencia" icon={Zap} value={formData.potencia} onChange={(v: any) => handleInputChange('potencia', v)}/>
                    
                    <button 
                        onClick={handleCaptureLocation} 
                        disabled={locationStatus === 'loading'} 
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-center gap-2 font-black shadow-sm text-xs transition-all active:scale-95 disabled:opacity-50 ${formData.location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 text-slate-400 hover:border-primary'}`}
                    >
                        {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14}/> : formData.location ? <CheckCircle2 size={14} className="text-emerald-500"/> : <MapPin size={14}/>}
                        <span>{formData.location ? `${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : (gpsRequired ? 'CAPTURAR GPS (REQUERIDO)' : 'CAPTURAR GPS (OPCIONAL)')}</span>
                    </button>
                </div>
            </section>
            
            {/* --- CHECKLISTS --- */}
            {Object.entries(CHECKLIST_SECTIONS).map(([section, items]) => (
                <section key={section} className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-3 border border-slate-100">
                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">{section}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                        {(items as string[]).map(it => (
                        <div key={it} className={`p-3 rounded-xl flex justify-between items-center transition-all border ${formData.checklist[it] ? 'bg-primary/5 border-primary/20' : 'bg-slate-50/50 border-slate-100'}`}>
                            <span className="text-[11px] font-bold text-slate-700 leading-tight pr-2">{it}</span>
                            <div className="flex gap-1 shrink-0">
                            {["OK", "DEFECT", "CAMBIO"].map(st => (
                                <button 
                                  key={st} 
                                  onClick={() => handleChecklistChange(it, st)} 
                                  className={`w-14 h-7 rounded-lg text-[8px] font-black border transition-all active:scale-90 ${formData.checklist[it] === st ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'}`}
                                >
                                  {st}
                                </button>
                            ))}
                            </div>
                        </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* --- PRUEBAS --- */}
            <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Datos de Pruebas DinÃ¡micas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StableInput icon={Clock} label="Horas" value={formData.datos_pruebas.horas} onChange={(v: any) => handleNestedChange('datos_pruebas', 'horas', v)} />
                    <StableInput icon={Gauge} label="PresiÃ³n Aceite" value={formData.datos_pruebas.presion} onChange={(v: any) => handleNestedChange('datos_pruebas', 'presion', v)} />
                    <StableInput icon={Thermometer} label="Temperatura" value={formData.datos_pruebas.temperatura} onChange={(v: any) => handleNestedChange('datos_pruebas', 'temperatura', v)} />
                    <StableInput icon={Droplets} label="Nivel Combustible" value={formData.datos_pruebas.nivel_combustible} onChange={(v: any) => handleNestedChange('datos_pruebas', 'nivel_combustible', v)} />
                    <StableInput icon={Zap} label="TensiÃ³n Alternador" value={formData.datos_pruebas.tension_alternador} onChange={(v: any) => handleNestedChange('datos_pruebas', 'tension_alternador', v)} />
                    <StableInput icon={Wind} label="Frecuencia" value={formData.datos_pruebas.frecuencia} onChange={(v: any) => handleNestedChange('datos_pruebas', 'frecuencia', v)} />
                    <StableInput icon={Battery} label="Carga BaterÃ­as" value={formData.datos_pruebas.carga_baterias} onChange={(v: any) => handleNestedChange('datos_pruebas', 'carga_baterias', v)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 mt-3">
                    <LoadTestInput label="TensiÃ³n RS" value={formData.pruebas_carga.tension_rs} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_rs', v)} />
                    <LoadTestInput label="TensiÃ³n ST" value={formData.pruebas_carga.tension_st} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_st', v)} />
                    <LoadTestInput label="TensiÃ³n RT" value={formData.pruebas_carga.tension_rt} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_rt', v)} />
                    <LoadTestInput label="Intensidad R" value={formData.pruebas_carga.intensidad_r} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_r', v)} />
                    <LoadTestInput label="Intensidad S" value={formData.pruebas_carga.intensidad_s} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_s', v)} />
                    <LoadTestInput label="Intensidad T" value={formData.pruebas_carga.intensidad_t} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_t', v)} />
                    <LoadTestInput label="Potencia kW" value={formData.pruebas_carga.potencia_kw} onChange={(v: any) => handleNestedChange('pruebas_carga', 'potencia_kw', v)} />
                </div>
            </section>
            
            <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <h2 className="text-lg font-black text-black flex items-center gap-2 uppercase tracking-tighter"><Camera className="text-primary" size={18}/> Registro FotogrÃ¡fico</h2>
                <div>
                    <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-white hover:border-primary transition-all group active:scale-[0.99]">
                        <Camera size={28} className="text-slate-300 mb-1.5 group-hover:text-primary transition-colors"/>
                        <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">AÃ±adir Fotos de Evidencia</span>
                    </label>
                    <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange}/>
                </div>
                {images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {images.map((img, i) => (
                            <div key={i} className="relative aspect-square shadow-sm rounded-lg overflow-hidden border border-slate-100">
                                <img src={URL.createObjectURL(img)} alt={`preview ${i}`} className="w-full h-full object-cover transition-transform hover:scale-110"/>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* --- OBSERVACIONES Y FIRMAS --- */}
            <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Hallazgos y Comentarios</h3>
                <textarea className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none outline-none focus:border-primary focus:bg-white transition-all shadow-inner text-sm font-medium text-black" placeholder="Escriba aquÃ­ cualquier anomalÃ­a o trabajo adicional recomendado..." value={formData.observaciones} onChange={(e: any) => handleInputChange('observaciones', e.target.value)}/>
                <div className="grid md:grid-cols-2 gap-6 items-start pt-4">
                    <div>
                        <SignaturePad title="Firma del Inspector TÃ©cnico" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
                        <p className="text-center font-black mt-2 text-slate-400 text-[8px] uppercase">{inspectorName}</p>
                    </div>
                    <div>
                        <SignaturePad title="ValidaciÃ³n del Cliente" signature={clientSignature} onSignatureEnd={setClientSignature} />
                        <div className="mt-3">
                        <StableInput label="Persona que valida" icon={User} value={formData.recibidoPor} onChange={(v: any) => handleInputChange('recibidoPor', v)} placeholder="Nombre completo"/>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ACCIONES --- */}
            <div className="flex flex-col md:flex-row gap-3 pt-4">
                <button 
                    onClick={() => handlePdfAction(false)} 
                    disabled={pdfLoading} 
                    className="w-full p-5 bg-white text-black border border-slate-200 rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-3 active:scale-95 transition-all hover:border-primary disabled:opacity-50"
                >
                    {pdfLoading ? <Loader2 className="animate-spin text-primary" size={18} /> : isSaved ? <Printer className="text-primary" size={18} /> : <FileSearch className="text-primary" size={18} />}
                    {pdfLoading ? 'GENERANDO...' : isSaved ? 'IMPRIMIR PDF FINAL' : 'VISTA PREVIA PDF'}
                </button>
                <button 
                    onClick={handleSave} 
                    disabled={saving || isSaved} 
                    className="w-full p-5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 disabled:bg-slate-700"
                >
                    {saving ? <Loader2 className="animate-spin text-white" size={18} /> : isSaved ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Save className="text-white" size={18} />}
                    {saving ? 'GUARDANDO INFORME...' : isSaved ? 'INFORME GUARDADO' : 'FINALIZAR REVISIÃ“N'}
                </button>
            </div>
        </main>
    </div>
  );
}



