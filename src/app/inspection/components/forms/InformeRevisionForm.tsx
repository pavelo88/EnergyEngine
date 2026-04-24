'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Wind, Gauge, Thermometer, Droplets, Battery, Zap, Mic, Camera, ClipboardList, FileText } from 'lucide-react';
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
import { resolveInspectorEmail } from '@/lib/inspection-mode';
import { getNextSequenceForUser } from '@/lib/sequence-manager';
import { addImageSafely, getPdfFileName } from '@/lib/pdf-utils';
import { MAX_IMAGES_PER_REPORT } from '@/lib/report-limits';
import { timeToDecimal, decimalToTime } from '@/lib/utils';

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
  const darkColor = '#165a30';
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
    doc.text(`INFORME DE REVISIÓN - Nº: ${finalID}`, leftMargin, currentY);
    currentY += 6;

    autoTable(doc, {
      startY: currentY,
      body: [
        [{ content: 'CLIENTE:', styles: { fontStyle: 'bold', cellWidth: 35 } }, { content: report.clienteNombre || report.cliente || '', colSpan: 3 }],
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

    const colWidth = 28;
    autoTable(doc, {
      startY: currentY,
      head: [['INSPECCIÓN / ESTADO', 'OK', 'DEFECT', 'CAMBIO']],
      body: Object.entries(CHECKLIST_SECTIONS).flatMap(([section, items]) => {
        const sectionRows: any[] = [[{ content: section, colSpan: 4, styles: { fontStyle: 'bold', fillColor: '#f1f5f9', textColor: '#000', halign: 'left' } }]];
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
        [{ content: 'DATOS DE PRUEBAS', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' } }, { content: 'VALORES', styles: { fontStyle: 'bold', fillColor: darkColor, textColor: '#fff' } }],
        // PROTECCIÓN 1
        ['Horas de funcionamiento', report.datos_pruebas?.horas || ''],
        ['Presión aceite', report.datos_pruebas?.presion || ''],
        ['Temperatura en bloque motor', report.datos_pruebas?.temperatura || ''],
        ['Nivel de deposito de combustible', report.datos_pruebas?.nivel_combustible || ''],
        ['Tensión en el alternador', report.datos_pruebas?.tension_alternador || ''],
        ['Frecuencia', report.datos_pruebas?.frecuencia || ''],
        ['Carga de baterías', report.datos_pruebas?.carga_baterias || ''],
        [{ content: 'PRUEBAS CON CARGA', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }],
        // PROTECCIÓN 2
        [{ content: `Tensión: RS: ${report.pruebas_carga?.tension_rs || ''}   ST: ${report.pruebas_carga?.tension_st || ''}   RT: ${report.pruebas_carga?.tension_rt || ''}`, colSpan: 2 }],
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

    addImageSafely(doc, report.inspectorSignatureUrl, 25, currentY, 60, 25);
    doc.line(25, currentY + 25, 85, currentY + 25);
    doc.text("Firma técnico:", 25, currentY + 30);
    doc.text(inspectorName || '', 25, currentY + 35);

    if (report.includeClientSignature) {
      addImageSafely(doc, report.clientSignatureUrl, 125, currentY, 60, 25);
      doc.line(125, currentY + 25, 185, currentY + 25);
      doc.text("Conforme cliente:", 125, currentY + 30);
      doc.text(report.recibidoPor || '', 125, currentY + 35);
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, totalPages);
    }
  } catch (err) {
    console.error("Fallo al generar PDF de Revisión:", err);
  }

  return doc;
};

export default function InformeRevisionForm({ initialData, aiData, onSuccess, isAdmin = false }: { initialData: any, aiData: ProcessDictationOutput | null, onSuccess: () => void, isAdmin?: boolean }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email || '');
  const canUseCloud = isOnline && !!firestore && !!user?.email;
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
  const [includeClientSignature, setIncludeClientSignature] = useState(false);
  const gpsRequired = useGpsRequired();

  // Detect if we're editing an existing completed/preapproved report
  const isEditingExisting = !!(initialData?.estado && ['Registrado', 'Aprobado'].includes(initialData.estado) && (initialData?.numero_informe || initialData?.firebaseId || initialData?.id));

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
      if (initialData.estado && ['Registrado', 'Aprobado'].includes(initialData.estado)) {
        // Editing existing completed report - populate ALL fields
        setFormData((prev: any) => ({
          ...prev,
          ...initialData,
          clienteId: initialData.clienteId || prev.clienteId,
          cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
          clienteNombre: initialData.clienteNombre || initialData.cliente || prev.clienteNombre,
          numero_informe: initialData.numero_informe || initialData.firebaseId || initialData.id || prev.numero_informe,
          parametrosTecnicos: {
            ...initialData.parametrosTecnicos,
            horas: typeof initialData.parametrosTecnicos?.horas === 'number' ? decimalToTime(initialData.parametrosTecnicos.horas) : initialData.parametrosTecnicos?.horas || '',
          }
        }));
        if (initialData.inspectorSignatureUrl) setInspectorSignature(initialData.inspectorSignatureUrl);
        if (initialData.clientSignatureUrl) setClientSignature(initialData.clientSignatureUrl);
        setSavedDocId(initialData.numero_informe || initialData.firebaseId || initialData.id || '');
      } else {
        setFormData((prev: any) => ({
          ...prev,
          clienteId: initialData.clienteId || prev.clienteId,
          cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
          clienteNombre: initialData.clienteNombre || initialData.cliente || prev.clienteNombre,
          instalacion: initialData.instalacion || prev.instalacion,
          direccion: initialData.direccion || prev.direccion,
          motor: initialData.modelo || prev.motor || '',
          modelo: initialData.n_motor || prev.modelo || '',
          n_motor: initialData.n_motor || prev.n_motor || '',
          n_grupo: initialData.n_grupo || prev.n_grupo || '',
          potencia: initialData.potencia || prev.potencia || '',
          observaciones: initialData.descripcion || prev.observaciones || '',
        }));
      }
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
          cliente: aiData.identidad.cliente || prev.cliente,
          instalacion: aiData.identidad.instalacion || prev.instalacion,
          direccion: aiData.identidad.direccion || prev.direccion,
          motor: aiData.identidad.modelo || prev.motor,
          modelo: aiData.identidad.marca || prev.modelo,
          n_motor: aiData.identidad.sn || prev.n_motor,
          n_grupo: aiData.identidad.n_grupo || prev.n_grupo,
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
    setFormData((prev: any) => ({ ...prev, [field]: value }));
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
      toast({ variant: 'destructive', title: 'Error de GPS', description: 'Tu dispositivo no soporta geolocalización.' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleInputChange('location', { lat: latitude, lon: longitude });
        setLocationStatus('success');
        toast({ title: 'GPS Registrado', description: 'Ubicación capturada con éxito.' });
      },
      () => {
        toast({ variant: 'destructive', title: 'Error de GPS', description: 'Por favor active los permisos de ubicación.' });
        setLocationStatus('error');
      }
    );
  };

  const handlePdfAction = (forceDownload = false, docIdOverride?: string) => {
    if (!formData.cliente || !formData.instalacion) {
      toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Complete Cliente e Instalación para ver la vista previa.' });
      return;
    }

    setPdfLoading(true);
    setTimeout(() => {
      try {
        const reportData = {
          ...formData,
          includeClientSignature,
          inspectorSignatureUrl: inspectorSignature,
          clientSignatureUrl: includeClientSignature ? clientSignature : null,
        };
        const finalId = docIdOverride || (isSaved ? savedDocId : 'BORRADOR');
        const doc = generatePDF(reportData, inspectorName, finalId);

        if (isSaved || forceDownload) {
          // SOLUCIÓN: FORZAR .pdf
          doc.save(`${finalId}.pdf`);
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
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (images.length + selected.length > MAX_IMAGES_PER_REPORT) {
      toast({
        variant: 'destructive',
        title: 'Limite de imagenes',
        description: `Maximo ${MAX_IMAGES_PER_REPORT} imagenes por informe.`,
      });
      return;
    }
    setImages((prev) => [...prev, ...selected]);
  };

  const handleSave = async () => {
    if (!inspectorEmail) {
      toast({ variant: 'destructive', title: 'Inspector no identificado', description: 'Inicia online una vez para habilitar el modo offline.' });
      return;
    }
    if (isSaved && !isEditingExisting) return;

    const missing = [];
    if (!formData.cliente) missing.push('Cliente');
    if (!formData.instalacion) missing.push('Instalacion');
    if (gpsRequired && !formData.location) missing.push('Ubicacion GPS');
    if (!inspectorSignature) missing.push('Firma Inspector');
    if (includeClientSignature && !clientSignature) missing.push('Firma Cliente');

    if (missing.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos obligatorios',
        description: `Complete los siguientes campos: ${missing.join(', ')}`
      });
      return;
    }

    if (images.length > MAX_IMAGES_PER_REPORT) {
      toast({
        variant: 'destructive',
        title: 'Limite de imagenes',
        description: `Maximo ${MAX_IMAGES_PER_REPORT} imagenes por informe.`,
      });
      return;
    }

    let didStartSave = false;
    try {
      const names = inspectorName.split(' ');
      const inspectorInitials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

      if (!inspectorInitials) {
        toast({ variant: 'destructive', title: 'Identificación Requerida', description: 'No se han detectado sus iniciales. Por favor, revise su perfil.' });
        return;
      }
      setSaving(true);
      didStartSave = true;

      // --- EDITING AN EXISTING COMPLETED/PRE-APPROVED REPORT ---
      if (isEditingExisting && savedDocId && canUseCloud && firestore) {
        const existingDocId = savedDocId;
        const storage = getStorage();
        let inspectorSignatureUrl = (formData as any).inspectorSignatureUrl || inspectorSignature;
        if (inspectorSignature && inspectorSignature.startsWith('data:')) {
          const sRef = ref(storage, `firmas/${existingDocId}/inspector.png`);
          await uploadString(sRef, inspectorSignature, 'data_url');
          inspectorSignatureUrl = await getDownloadURL(sRef);
        }
        let clientSignatureUrl = (formData as any).clientSignatureUrl || clientSignature;
        if (clientSignature && clientSignature.startsWith('data:')) {
          const cRef = ref(storage, `firmas/${existingDocId}/cliente.png`);
          await uploadString(cRef, clientSignature, 'data_url');
          clientSignatureUrl = await getDownloadURL(cRef);
        }
        await updateDoc(doc(firestore, 'informes', existingDocId), {
          ...formData,
          parametrosTecnicos: {
            ...formData.parametrosTecnicos,
            horas: timeToDecimal(formData.parametrosTecnicos.horas)
          },
          inspectorSignatureUrl,
          clientSignatureUrl,
          estado: isAdmin ? 'Aprobado' : 'Registrado',
          ultimaModificacion: Timestamp.now(),
          ...(isAdmin ? { aprobadoPor: 'Admin', fecha_aprobacion: Timestamp.now() } : {})
        });
        setIsSaved(true);
        toast({ title: '¡Documento Actualizado!', description: `Informe ${existingDocId} guardado como Registrado.` });
        handlePdfAction(true, existingDocId);
        if (onSuccess) onSuccess();
        return;
      }

      const sequence = await getNextSequenceForUser({
        type: 'informe-revision',
        userEmail: inspectorEmail || '',
        firestore: canUseCloud ? firestore : null,
        isOnline: canUseCloud,
      });
      const year = new Date().getFullYear();
      const docId = `IR-${inspectorInitials}-${year}-${sequence.toString().padStart(4, '0')}`;
      const limitedImages = images.slice(0, MAX_IMAGES_PER_REPORT);

      const saveDataToLocal = async (synced: boolean, firebaseId: string) => {
        const localData: any = {
          ...formData,
          orderId: initialData?.orderId || initialData?.id || null,
          numero_ot: initialData?.numero_ot || initialData?.id || null,
          procedencia: (initialData?.numero_ot || initialData?.id?.startsWith('OT-')) ? 'OT' : 'INDEPENDIENTE',
          numero_informe: firebaseId,
        };
        if (!synced) {
          localData.images = limitedImages;
          localData.inspectorSignature = inspectorSignature;
          localData.clientSignature = clientSignature;
        }
        await dbLocal.hojas_trabajo.add({
          firebaseId: firebaseId || '',
          synced,
          data: localData,
          createdAt: new Date(),
        });

        setSavedDocId(firebaseId || '');
        setIsSaved(true);

        if (!synced) {
          toast({ title: 'Guardado local', description: 'Error de red. El informe se sincronizara automaticamente despues.' });
        } else {
          toast({ title: 'Informe guardado', description: `Documento sincronizado con ID: ${firebaseId}` });
        }

        handlePdfAction(true, firebaseId);

        if (onSuccess) onSuccess();
      };

      if (canUseCloud && firestore && user?.email) {
        try {
          const storage = getStorage();

          const imageUrls = await Promise.all(limitedImages.map(async (image) => {
            const imageRef = ref(storage, `informes/${docId}/${image.name}`);
            await uploadBytes(imageRef, image);
            return getDownloadURL(imageRef);
          }));

          let inspectorSignatureUrl = (formData as any).inspectorSignatureUrl || null;
          if (inspectorSignature && inspectorSignature.startsWith('data:')) {
            const inspectorSignatureRef = ref(storage, `firmas/${docId}/inspector.png`);
            await uploadString(inspectorSignatureRef, inspectorSignature, 'data_url');
            inspectorSignatureUrl = await getDownloadURL(inspectorSignatureRef);
          }

          let clientSignatureUrl = (formData as any).clientSignatureUrl || null;
          if (includeClientSignature && clientSignature && clientSignature.startsWith('data:')) {
            const clientSignatureRef = ref(storage, `firmas/${docId}/cliente.png`);
            await uploadString(clientSignatureRef, clientSignature, 'data_url');
            clientSignatureUrl = await getDownloadURL(clientSignatureRef);
          }

          const docData = {
            ...formData,
            includeClientSignature,
            parametrosTecnicos: {
              ...formData.parametrosTecnicos,
              horas: timeToDecimal(formData.parametrosTecnicos.horas)
            },
            imageUrls,
            inspectorSignatureUrl,
            clientSignatureUrl: includeClientSignature ? clientSignatureUrl : null,
            inspectorId: inspectorEmail || '',
            inspectorNombre: inspectorName,
            inspectorInitials,
            inspectorIds: initialData?.inspectorIds || (inspectorEmail ? [inspectorEmail] : []),
            inspectorNombres: initialData?.inspectorNombres || [inspectorName],
            fecha_creacion: Timestamp.now(),
            formType: formData.formType || 'informe-revision',
            id: docId,
            numero_informe: docId,
            orderId: initialData?.orderId || initialData?.id || null,
            numero_ot: initialData?.numero_ot || initialData?.id || null,
            procedencia: (initialData?.numero_ot || initialData?.id?.startsWith('OT-')) ? 'OT' : 'INDEPENDIENTE',
            estado: 'Registrado'
          };

          await setDoc(doc(firestore, 'informes', docId), docData);

          // Actualizar estado de la OT a 'En Proceso'
          if (docData.orderId) {
            await updateDoc(doc(firestore, 'ordenes_trabajo', docData.orderId), { estado: 'En Proceso' });
          }

          if (initialData?.id) {
            // updateOriginalJobStatus(jobId) removed
          }

          await saveDataToLocal(true, docId);

        } catch (error) {
          console.error('Fallo al guardar en la nube:', error);
          await saveDataToLocal(false, docId);
        }
      } else {
        await saveDataToLocal(false, docId);
      }
    } catch (error) {
      console.error('Error en guardado de informe de revision:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar',
        description: 'Intente nuevamente. Si continua, revise conexion y permisos.',
      });
    } finally {
      if (didStartSave) setSaving(false);
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
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white text-slate-950 light">
          {/* SOLUCIÓN: Botón en cabecera */}
          <DialogHeader className="p-6 border-b border-slate-100 bg-white flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="font-black uppercase tracking-tighter text-black">Vista Previa Informe de Revisión</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">Documento temporal generado para verificación de datos.</DialogDescription>
            </div>
            <button
              onClick={() => handlePdfAction(true)}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-sm active:scale-95"
            >
              Descargar PDF
            </button>
          </DialogHeader>
          <div className="flex-1 bg-slate-100">
            {previewPdfUrl && <iframe src={`${previewPdfUrl}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>

      <main className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-black border-l-4 border-primary pl-4 uppercase tracking-tighter">Informe de Revisión Anual/Semestral</h2>
          
          {(initialData?.numero_ot || (initialData?.id && initialData.id.startsWith('OT-'))) ? (
            <div className="bg-primary/5 border border-primary/10 px-4 py-2 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-500">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList size={16} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest leading-none">Vinculado a OT</span>
                <span className="text-xs font-black text-primary uppercase tracking-tight">
                  {initialData.numero_ot || initialData.id}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <FileText size={16} className="text-slate-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Tipo de Informe</span>
                <span className="text-xs font-black text-slate-500 uppercase tracking-tight">
                  INFORME INDEPENDIENTE
                </span>
              </div>
            </div>
          )}
        </div>

        {/* --- DATOS GENERALES --- */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente Base</label>
              <div className="bg-white border border-slate-100 rounded-2xl">
                <ClientSelector onSelect={handleClientSelect} selectedClientId={formData.clienteId} />
              </div>
            </div>
            <StableInput label="Instalación" icon={MapPin} value={formData.instalacion} onChange={(v: any) => handleInputChange('instalacion', v)} />
            <StableInput label="Dirección" icon={MapPin} value={formData.direccion} onChange={(v: any) => handleInputChange('direccion', v)} />
            <StableInput label="Fecha Revisión" icon={Calendar} type="date" value={formData.fecha_revision} onChange={(v: any) => handleInputChange('fecha_revision', v)} />
            <StableInput label="Motor" icon={Settings} value={formData.motor} onChange={(v: any) => handleInputChange('motor', v)} />
            <StableInput label="Modelo" icon={Type} value={formData.modelo} onChange={(v: any) => handleInputChange('modelo', v)} />
            <StableInput label="Nº Motor" icon={Hash} value={formData.n_motor} onChange={(v: any) => handleInputChange('n_motor', v)} />
            <StableInput label="Nº Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: any) => handleInputChange('n_grupo', v)} />
            <StableInput label="Potencia" icon={Zap} value={formData.potencia} onChange={(v: any) => handleInputChange('potencia', v)} />

            <button
              onClick={handleCaptureLocation}
              disabled={locationStatus === 'loading'}
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-center gap-2 font-black shadow-sm text-xs transition-all active:scale-95 disabled:opacity-50 ${formData.location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 text-slate-400 hover:border-primary'}`}
            >
              {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14} /> : formData.location ? <CheckCircle2 size={14} className="text-emerald-500" /> : <MapPin size={14} />}
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
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Datos de Pruebas Dinámicas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StableInput icon={Clock} label="Horas" value={formData.datos_pruebas.horas} onChange={(v: any) => handleNestedChange('datos_pruebas', 'horas', v)} />
            <StableInput icon={Gauge} label="Presión Aceite" value={formData.datos_pruebas.presion} onChange={(v: any) => handleNestedChange('datos_pruebas', 'presion', v)} />
            <StableInput icon={Thermometer} label="Temperatura" value={formData.datos_pruebas.temperatura} onChange={(v: any) => handleNestedChange('datos_pruebas', 'temperatura', v)} />
            <StableInput icon={Droplets} label="Nivel Combustible" value={formData.datos_pruebas.nivel_combustible} onChange={(v: any) => handleNestedChange('datos_pruebas', 'nivel_combustible', v)} />
            <StableInput icon={Zap} label="Tensión Alternador" value={formData.datos_pruebas.tension_alternador} onChange={(v: any) => handleNestedChange('datos_pruebas', 'tension_alternador', v)} />
            <StableInput icon={Wind} label="Frecuencia" value={formData.datos_pruebas.frecuencia} onChange={(v: any) => handleNestedChange('datos_pruebas', 'frecuencia', v)} />
            <StableInput icon={Battery} label="Carga Baterías" value={formData.datos_pruebas.carga_baterias} onChange={(v: any) => handleNestedChange('datos_pruebas', 'carga_baterias', v)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 mt-3">
            <LoadTestInput label="Tensión RS" value={formData.pruebas_carga.tension_rs} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_rs', v)} />
            <LoadTestInput label="Tensión ST" value={formData.pruebas_carga.tension_st} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_st', v)} />
            <LoadTestInput label="Tensión RT" value={formData.pruebas_carga.tension_rt} onChange={(v: any) => handleNestedChange('pruebas_carga', 'tension_rt', v)} />
            <LoadTestInput label="Intensidad R" value={formData.pruebas_carga.intensidad_r} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_r', v)} />
            <LoadTestInput label="Intensidad S" value={formData.pruebas_carga.intensidad_s} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_s', v)} />
            <LoadTestInput label="Intensidad T" value={formData.pruebas_carga.intensidad_t} onChange={(v: any) => handleNestedChange('pruebas_carga', 'intensidad_t', v)} />
            <LoadTestInput label="Potencia kW" value={formData.pruebas_carga.potencia_kw} onChange={(v: any) => handleNestedChange('pruebas_carga', 'potencia_kw', v)} />
          </div>
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-lg font-black text-black flex items-center gap-2 uppercase tracking-tighter"><Camera className="text-primary" size={18} /> Registro Fotográfico</h2>
          <div>
            <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-white hover:border-primary transition-all group active:scale-[0.99]">
              <Camera size={28} className="text-slate-300 mb-1.5 group-hover:text-primary transition-colors" />
              <span className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Añadir Fotos de Evidencia</span>
            </label>
            <input id="image-upload" type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square shadow-sm rounded-lg overflow-hidden border border-slate-100">
                  <img src={URL.createObjectURL(img)} alt={`preview ${i}`} className="w-full h-full object-cover transition-transform hover:scale-110" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* --- OBSERVACIONES Y FIRMAS --- */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <div className="flex items-center gap-3 text-left">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${includeClientSignature ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'}`}>
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">¿Incluir Firma del Cliente?</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Activar solo si el cliente validará el informe</p>
              </div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={includeClientSignature} onChange={(e) => setIncludeClientSignature(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </div>
          </div>

          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5">Hallazgos y Comentarios</h3>
          <textarea className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl p-3 resize-none outline-none focus:border-primary focus:bg-white transition-all shadow-inner text-sm font-medium text-black" placeholder="Escriba aquí cualquier anomalía o trabajo adicional recomendado..." value={formData.observaciones} onChange={(e: any) => handleInputChange('observaciones', e.target.value)} />
          <div className="grid md:grid-cols-2 gap-6 items-start pt-4">
            <div className="text-left">
              <SignaturePad title="Firma del Inspector Técnico" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
              <p className="text-center font-black mt-2 text-slate-400 text-[8px] uppercase">{inspectorName}</p>
            </div>
            {includeClientSignature && (
              <div className="animate-in zoom-in duration-300 text-left">
                <SignaturePad title="Validación del Cliente" signature={clientSignature} onSignatureEnd={setClientSignature} />
                <div className="mt-3">
                  <StableInput label="Persona que valida" icon={User} value={formData.recibidoPor} onChange={(v: any) => handleInputChange('recibidoPor', v)} placeholder="Nombre completo" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SOLUCIÓN: Botones Directos */}
        <div className="flex flex-col md:flex-row gap-3 pt-4">
          <button
            onClick={() => handlePdfAction(false)}
            disabled={pdfLoading}
            className="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 hover:border-primary transition-all text-slate-600 shadow-sm active:scale-95 disabled:opacity-50 text-xs"
          >
            {pdfLoading ? <Loader2 className="animate-spin text-primary" size={16} /> : <FileSearch size={16} className="text-primary" />}
            VISTA PREVIA
          </button>

          <button
            onClick={() => handlePdfAction(true)}
            disabled={pdfLoading}
            className="w-full p-4 bg-white border border-slate-200 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 hover:border-primary transition-all text-black shadow-md active:scale-95 disabled:opacity-50 text-xs"
          >
            {pdfLoading ? <Loader2 className="animate-spin text-primary" size={16} /> : <Printer size={16} className="text-primary" />}
            {isSaved ? 'DESCARGAR PDF FINAL' : 'DESCARGAR BORRADOR'}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || (isSaved && !isEditingExisting)}
            className="w-full p-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-2 disabled:bg-slate-700 shadow-xl active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="animate-spin text-white" size={16} /> : isSaved && !isEditingExisting ? <CheckCircle2 className="text-emerald-400" size={16} /> : <Save className="text-white" size={16} />}
            {saving ? 'GUARDANDO DATOS...' : isSaved && !isEditingExisting ? 'GUARDADO' : isEditingExisting ? (isAdmin ? 'GUARDAR COMO APROBADO' : 'GUARDAR CAMBIOS (REGISTRADO)') : 'REGISTRAR TRABAJO'}
          </button>
        </div>
      </main>
    </div>
  );
}