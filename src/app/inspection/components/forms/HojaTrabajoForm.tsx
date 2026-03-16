'use client';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Wand2, Loader2, Save, FileSearch, Printer, CheckCircle2, User, Users, MapPin, Settings, Type, Hash, Calendar, Clock, Car, Euro, Zap, Thermometer, Battery, Droplets, Wind, Gauge, Camera } from 'lucide-react';
import { enhanceTechnicalRequest } from '@/ai/flows/enhance-technical-request-flow';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SignaturePad from '../SignaturePad';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { drawPdfHeader, drawPdfFooter } from '../../lib/pdf-helpers';
import { useToast } from '@/hooks/use-toast';
import { useGpsRequired } from '@/hooks/use-gps-required';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientSelector from '../ClientSelector';
import StableInput from '../StableInput';
import { generateReportId, fileToBase64 } from '@/lib/offline-utils';
import { getInspectionMode, resolveInspectorEmail } from '@/lib/inspection-mode';

const LoadTestInput = React.memo(({ label, value, onChange }: any) => (
    <div className="flex flex-col items-center gap-1">
        <label className="text-[8px] font-black text-slate-500 w-full text-center">{label}</label>
        <input 
            type="text" 
            value={value || ''} 
            onChange={(e: any) => onChange(e.target.value)}
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

  let currentY = topMargin;

  try {
    doc.setTextColor(darkColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("HOJA DE TRABAJOS", leftMargin, currentY);

    doc.setFontSize(10);
    doc.text(`NÂº: ${finalID}`, pageWidth - rightMargin, currentY, { align: 'right' });
    currentY += 6;

    autoTable(doc, {
        startY: currentY,
        body: [
            [{content: 'CLIENTE:', styles: {fontStyle: 'bold'}}, report.clienteNombre || report.cliente, {content: 'FECHA:', styles: {fontStyle: 'bold'}}, report.fecha],
            [{content: 'INSTALACIÃ“N:', styles: {fontStyle: 'bold'}}, report.instalacion, {content: 'TÃ‰CNICOS:', styles: {fontStyle: 'bold'}}, report.tecnicos],
            [{content: 'UBICACIÃ“N (LAT/LON):', styles: {fontStyle: 'bold'}}, {content: report.location ? `${report.location.lat.toFixed(6)}, ${report.location.lon.toFixed(6)}` : 'No registrada', colSpan: 3}],
            [{content: 'MOTOR:', styles: {fontStyle: 'bold'}}, report.motor, {content: 'H. ASISTENCIA:', styles: {fontStyle: 'bold'}}, report.h_asistencia],
            [{content: 'NÂº MOTOR:', styles: {fontStyle: 'bold'}}, report.n_motor, {content: 'TIPO DE SERVICIO:', styles: {fontStyle: 'bold'}}, report.tipo_servicio],
            [{content: 'GRUPO:', styles: {fontStyle: 'bold'}}, report.grupo, {content: 'KMS.:', styles: {fontStyle: 'bold'}}, report.kms],
            [{content: 'NÂº GRUPO:', styles: {fontStyle: 'bold'}}, report.n_grupo, {content: 'DIETA:', styles: {fontStyle: 'bold'}}, `${report.dieta} â‚¬ ${report.media_dieta ? `(1/2 Cant: ${report.media_dieta_cantidad})`:''}`],
            [{content: 'NÂº DE PEDIDO:', styles: {fontStyle: 'bold'}}, report.n_pedido, '', ''],
        ],
        theme: 'grid',
        styles: {fontSize: 8, cellPadding: 2},
        margin: { left: leftMargin, right: rightMargin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("TRABAJOS REALIZADOS", leftMargin, currentY);
    currentY += 4;

    const rawText = report.trabajos_realizados || '';
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
                margin: { top: topMargin, bottom: bottomMargin, left: leftMargin, right: rightMargin },
                body: [[text]],
                theme: 'plain',
                styles: { font: 'helvetica', fontSize: 9, cellPadding: 0, halign: 'justify', textColor: darkColor },
                columnStyles: { 0: { cellWidth: contentWidth } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 4;
        }
    });

    currentY += 6;

    if (currentY + 40 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("PARÃMETROS TÃ‰CNICOS", leftMargin, currentY);
    currentY += 4;

    autoTable(doc, {
        startY: currentY,
        body: [
            [`Horas: ${report.parametrosTecnicos?.horas || ''}`, `PresiÃ³n Aceite: ${report.parametrosTecnicos?.presionAceite || ''}`, `TensiÃ³n: ${report.parametrosTecnicos?.tension || ''}`],
            [`TÂª (Â°C): ${report.parametrosTecnicos?.temperatura || ''}`, `Nivel Combustible (%): ${report.parametrosTecnicos?.nivelCombustible || ''}`, `Frecuencia (Hz): ${report.parametrosTecnicos?.frecuencia || ''}`],
            [{content: `TensiÃ³n de baterÃ­as (V): ${report.parametrosTecnicos?.tensionBaterias || ''}`, colSpan: 3}],
        ],
        theme: 'grid',
        styles: {fontSize: 8, cellPadding: 1.5, minCellHeight: 8},
        bodyStyles: {fontStyle: 'bold'},
        margin: { left: leftMargin, right: rightMargin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    if (currentY + 45 > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Potencia con carga: ${report.potenciaConCarga?.potencia || ''}`, leftMargin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        head: [['TensiÃ³n', 'Intensidad', 'Potencia (kW)']],
        body: [
            [`RS: ${report.potenciaConCarga?.tensionRS || ''}`, `R: ${report.potenciaConCarga?.intensidadR || ''}`, {rowSpan: 3, content: report.potenciaConCarga?.potenciaKW || '', styles: {valign: 'middle', halign: 'center'}}],
            [`ST: ${report.potenciaConCarga?.tensionST || ''}`, `S: ${report.potenciaConCarga?.intensidadS || ''}`],
            [`RT: ${report.potenciaConCarga?.tensionRT || ''}`, `T: ${report.potenciaConCarga?.intensidadT || ''}`],
        ],
        theme: 'grid',
        styles: {fontSize: 9, cellPadding: 1.5, minCellHeight: 8},
        headStyles: { fillColor: darkColor, textColor: '#fff' },
        bodyStyles: {fontStyle: 'bold'},
        margin: { left: leftMargin, right: rightMargin }
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

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
    console.error("Error al generar PDF:", err);
  }

  return doc;
};

export default function HojaTrabajoForm({ initialData, aiData, onSuccess }: { initialData?: any, aiData?: any, onSuccess?: () => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email);
  const canUseCloud = isOnline && getInspectionMode() === 'online' && !!firestore && !!user?.email;
  const { toast } = useToast();
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorInitials, setInspectorInitials] = useState('EE');
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    formType: 'hoja-trabajo',
    clienteId: '',
    clienteNombre: '',
    cliente: '',
    instalacion: '',
    motor: '',
    n_motor: '',
    grupo: '',
    n_grupo: '',
    n_pedido: '',
    location: null as { lat: number, lon: number } | null,
    fecha: new Date().toISOString().split('T')[0],
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
  
  const [inspectorSignature, setInspectorSignature] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('energy_engine_signature');
    }
    return null;
  });
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState('');
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const gpsRequired = useGpsRequired();

  useEffect(() => {
    const fetchData = async () => {
        if (inspectorEmail) {
            // Primero intentamos local (offline-first)
            const cachedSecurity = await dbLocal.table('seguridad').get(inspectorEmail);
            if (cachedSecurity?.nombre) {
                setInspectorName(cachedSecurity.nombre);
                setFormData(p => ({ ...p, tecnicos: cachedSecurity.nombre }));
                
                const names = cachedSecurity.nombre.split(' ');
                const initials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                setInspectorInitials(initials);
            } else {
                const fallbackName = inspectorEmail.split('@')[0];
                setInspectorName(fallbackName);
                setFormData(p => ({ ...p, tecnicos: fallbackName }));
            }

            // Luego intentamos Firebase si estÃ¡ online para refrescar
            if (canUseCloud && firestore && user?.email) {
              const userDocSnap = await getDoc(doc(firestore, 'usuarios', user.email));
              if (userDocSnap.exists()) {
                  const userData = userDocSnap.data();
                  setInspectorName(userData.nombre);
                  setFormData(p => ({ ...p, tecnicos: userData.nombre }));
                  
                  const names = userData.nombre.split(' ');
                  const initials = names.map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
                  setInspectorInitials(initials);
              }
            }
        }
    };
    fetchData();
  }, [inspectorEmail, canUseCloud, firestore, user]);

  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({
        ...prev,
        clienteId: initialData.clienteId || prev.clienteId,
        clienteNombre: initialData.clienteNombre || initialData.cliente || prev.clienteNombre,
        cliente: initialData.clienteNombre || initialData.cliente || prev.cliente,
        instalacion: initialData.instalacion || prev.instalacion,
        motor: initialData.modelo || prev.motor,
        n_motor: initialData.n_motor || prev.n_motor,
        trabajos_realizados: initialData.descripcion || prev.trabajos_realizados,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (aiData) {
      setFormData(prev => ({
        ...prev,
        cliente: aiData.identidad?.cliente || prev.cliente,
        motor: aiData.identidad?.marca || prev.motor,
        n_motor: aiData.identidad?.sn || prev.n_motor,
        instalacion: aiData.identidad?.instalacion || prev.instalacion,
        trabajos_realizados: aiData.observations_summary || prev.trabajos_realizados,
      }));
    }
  }, [aiData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({...prev, [field]: value }));
  };
  
  const handleClientSelect = (client: any) => {
    setFormData(p => ({ 
        ...p, 
        clienteId: client.id, 
        clienteNombre: client.nombre,
        cliente: client.nombre,
        instalacion: client.direccion || p.instalacion 
    }));
  };

  const handleNestedInputChange = (section: 'parametrosTecnicos' | 'potenciaConCarga', field: string, value: string) => {
    setFormData((prev: any) => ({
        ...prev,
        [section]: {
            ...(prev[section] as any),
            [field]: value
        }
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
        toast({ title: 'GPS Capturado', description: 'UbicaciÃ³n registrada correctamente.' });
      },
      () => {
        toast({ variant: 'destructive', title: 'Error de GPS', description: 'Por favor, activa los permisos de ubicaciÃ³n.' });
        setLocationStatus('error');
      }
    );
  };

  const improveReport = async () => {
    if (!formData.trabajos_realizados) return;
    setAiLoading(true);
    try {
      const res = await enhanceTechnicalRequest({ technicalRequest: formData.trabajos_realizados });
      setFormData((p: any) => ({
        ...p, 
        trabajos_realizados: res.improved,
      }));
       toast({ title: 'Â¡Reporte Mejorado!', description: 'La IA ha estructurado el texto formalmente.' });
    } catch(e: any) {
      toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo procesar con IA. Use texto manual.' });
    } finally {
      setAiLoading(false);
    }
  };

  const handlePdfAction = (forceDownload = false, docIdOverride?: string) => {
    if (!formData.clienteId) {
        toast({ variant: 'destructive', title: 'Faltan Datos', description: 'Seleccione un Cliente para previsualizar.' });
        return;
    }
    
    setPdfLoading(true);
    setTimeout(() => {
      try {
        const reportData = { ...formData, inspectorSignatureUrl: inspectorSignature, clientSignatureUrl: clientSignature };
        const finalId = docIdOverride || (isSaved ? savedDocId : 'BORRADOR');
        const docPdf = generatePDF(reportData, inspectorName, finalId);
        
        const rawClientName = formData.clienteNombre || formData.cliente || '';
        const sanitizedClientName = rawClientName
          .trim()
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
        const fileNameBase = sanitizedClientName
          ? `Hoja_Trabajo_${finalId}_${sanitizedClientName}`
          : `Hoja_Trabajo_${finalId}`;

        if (isSaved || forceDownload) {
            docPdf.save(`${fileNameBase}.pdf`);
        } else {
            const blob = docPdf.output('blob');
            const url = URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
        }
      } catch (e) {
        console.error("Fallo al generar PDF:", e);
        toast({ variant: "destructive", title: "Error de PDF", description: "No se pudo generar el documento." });
      } finally {
        setPdfLoading(false);
      }
    }, 500);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const handleSave = async () => {
    if (!inspectorEmail) {
      toast({ variant: 'destructive', title: 'Inspector no identificado', description: 'Inicia online una vez para habilitar el modo offline.' });
      return;
    }
    
    if (!formData.clienteId || (gpsRequired && !formData.location) || !inspectorSignature || !clientSignature) {
      toast({
        variant: 'destructive',
        title: 'Datos Incompletos',
        description: gpsRequired
          ? 'Cliente, Ubicacion GPS y ambas firmas son obligatorias.'
          : 'Cliente y ambas firmas son obligatorias.'
      });
      return;
    }

    console.log('ðŸ“ handleSave iniciado, isOnline:', isOnline);
    setSaving(true);

    // Mantener numeraciÃ³n secuencial para PDF (visible)
    const sequence = await dbLocal.getNextSequence('hoja-trabajo');
    const sequentialId = `HT-${inspectorInitials}-${sequence.toString().padStart(4, '0')}`;
    console.log(`ðŸ“Œ IDs generados: displayId=${sequentialId}`);
    
    // UUID interno para garantizar unicidad en Firestore (evita colisiones)
    const internalFirebaseId = generateReportId('HT');
    console.log(`   internalId=${internalFirebaseId}`);

    const saveDataToLocal = async (synced: boolean, firebaseId: string, displayId: string) => {
        console.log(`ðŸ’¾ saveDataToLocal: synced=${synced}, firebaseId=${firebaseId}, displayId=${displayId}`);
        
        const localData = { 
            ...formData, 
            originalJobId: initialData?.id || null,
            displayId // Guardamos el ID visible para referencia
        };
        
        // SIEMPRE guardar imÃ¡genes, firmas en IndexedDB offline
        const imageIds: number[] = [];
        if (images.length > 0) {
          console.log(`   ðŸ“¸ Guardando ${images.length} imÃ¡genes a IndexedDB...`);
          for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const base64 = await fileToBase64(image);
            const imgId = await dbLocal.imagenes.add({
              reportId: displayId,
              base64Data: base64,
              fileName: image.name,
              mimeType: image.type,
              synced: false,
              createdAt: new Date(),
            });
            imageIds.push(imgId);
            console.log(`     âœ… Imagen guardada: ${image.name} (id=${imgId})`);
          }
        }
        (localData as any).imageIds = imageIds;

        // Guardar firmas en IndexedDB como backup
        if (inspectorSignature && !synced) {
          await dbLocal.firmas.put({
            userEmail: inspectorEmail,
            base64Data: inspectorSignature,
            createdAt: new Date(),
          });
          console.log(`   âœ… Firma inspector guardada`);
        }
        if (clientSignature && !synced) {
          await dbLocal.firmas.put({
            userEmail: `${inspectorEmail}_client`,
            base64Data: clientSignature,
            createdAt: new Date(),
          });
          console.log(`   âœ… Firma cliente guardada`);
        }

        console.log(`   ðŸ“¥ Guardando a hojas_trabajo: firebaseId=${firebaseId}, synced=${synced}, dataKeys=${Object.keys(localData).join(',')}`);
        const recordId = await dbLocal.hojas_trabajo.add({ 
            firebaseId, 
            synced, 
            data: localData, 
            createdAt: new Date() 
        });
        console.log(`   âœ… Guardado en hojas_trabajo con id=${recordId}`);
        
        setSavedDocId(firebaseId);
        setIsSaved(true);
        setSaving(false);

        if (synced) toast({ title: 'Â¡Sincronizado!', description: `Informe guardado con ID: ${displayId}` });
        else toast({ title: 'Guardado Localmente', description: `Informe registrado como ${displayId}. Se subirÃ¡ al reconectar.` });

        const shouldDownload = window.confirm("Â¡Informe guardado con Ã©xito! Â¿Desea descargar el PDF ahora?");
        if (shouldDownload) {
            handlePdfAction(true, displayId);
        }
        
        if (onSuccess) onSuccess();
    };

    if (canUseCloud && typeof navigator !== 'undefined' && navigator.onLine && firestore && user?.email) {
        try {
            console.log('ðŸŸ¢ MODO ONLINE - Sincronizando a Firestore...');
            const storage = getStorage();
            
            // Subir imÃ¡genes
            console.log(`   ðŸ“¤ Subiendo ${images.length}imÃ¡genes a Storage...`);
            const imageUrls = await Promise.all(images.map(async (image) => {
                const imgRef = ref(storage, `informes/${internalFirebaseId}/${image.name}`);
                await uploadBytes(imgRef, image);
                const url = await getDownloadURL(imgRef);
                console.log(`     âœ… Imagen OK: ${image.name}`);
                return url;
            }));

            // Subir firmas
            console.log(`   ðŸ–‹ï¸ Subiendo firmas...`);
            const inspRef = ref(storage, `firmas/${internalFirebaseId}/inspector.png`);
            await uploadString(inspRef, inspectorSignature!, 'data_url');
            const inspectorSignatureUrl = await getDownloadURL(inspRef);
            console.log(`     âœ… Firma inspector OK`);

            const cliRef = ref(storage, `firmas/${internalFirebaseId}/cliente.png`);
            await uploadString(cliRef, clientSignature!, 'data_url');
            const clientSignatureUrl = await getDownloadURL(cliRef);
            console.log(`     âœ… Firma cliente OK`);
            
            const docData = {
                ...formData, 
                imageUrls, 
                inspectorSignatureUrl, 
                clientSignatureUrl,
                inspectorId: user.email, 
                inspectorNombre: inspectorName,
                inspectorIds: initialData?.inspectorIds || [user.email],
                inspectorNombres: initialData?.inspectorNombres || [inspectorName],
                fecha_creacion: Timestamp.now(), 
                numero_informe: sequentialId,  // ID visible, clave principal
                internalId: internalFirebaseId,  // UUID para referencia cruzada
                estado: 'Completado',
            };
            
            console.log(`   ðŸ’¾ Guardando en Firestore 'informes' con docId=${sequentialId} (clave principal)`);
            console.log(`      internalId=${internalFirebaseId} (referencia cruzada)`);
            // SIEMPRE usar sequentialId como clave del documento
            await setDoc(doc(firestore, 'informes', sequentialId), docData);
            console.log(`   âœ… Guardado en Firestore exitoso`);
            
            if (initialData?.id) {
              await updateDoc(doc(firestore, 'ordenes_trabajo', initialData.id), { estado: 'Completado' });
              console.log(`   âœ… Orden de trabajo actualizada`);
            }
            
            // Marcar imÃ¡genes como sincronizadas
            const pendingImages = await dbLocal.imagenes.where('reportId').equals(sequentialId).toArray();
            for (const img of pendingImages) {
              await dbLocal.imagenes.update(img.id!, { synced: true });
            }
            console.log(`   âœ… ImÃ¡genes marcadas como sincronizadas en IndexedDB`);
            
            // Guardar con sequentialId como clave (no internalId)
            await saveDataToLocal(true, sequentialId, sequentialId);
        } catch (error: any) {
            console.error("âŒ Error al guardar en la nube:", error?.message, error?.stack);
            // Guardar localmente como fallback incluso si Storage/Firestore cae a mitad del flujo.
            try {
              console.log("   âš ï¸ Guardando localmente como fallback...");
              await saveDataToLocal(false, sequentialId, sequentialId);
            } catch (localErr: any) {
              console.error("âŒ Error guardando fallback local:", localErr?.message, localErr?.stack);
              setSaving(false);
              toast({ variant: 'destructive', title: 'Error crÃ­tico', description: 'No se pudo guardar ni online ni offline.' });
            }
        }
    } else {
        // Offline: guardar todo localmente
        console.log('ðŸ”´ MODO OFFLINE - Guardando a IndexedDB...');
        await saveDataToLocal(false, sequentialId, sequentialId);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full bg-white">
      <Dialog open={!!previewPdfUrl} onOpenChange={(isOpen) => {
        if (!isOpen && previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
        }
      }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 rounded-[2.5rem] overflow-hidden border-slate-100 bg-white">
          <DialogHeader className="p-6 border-b border-slate-100 bg-white">
            <DialogTitle className="font-black uppercase tracking-tighter text-black">Borrador de Informe TÃ©cnico</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Previsualice el documento antes de realizar el guardado final.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 bg-slate-100">
            {previewPdfUrl && <iframe src={previewPdfUrl} className="w-full h-full object-contain border-none" title="PDF Preview" />}
          </div>
        </DialogContent>
      </Dialog>
      
      <main className="space-y-6 pb-20">
        <h2 className="text-xl font-black text-black border-l-4 border-primary pl-4 uppercase tracking-tighter">Hoja de Trabajo</h2>
      
        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2 space-y-2 text-left">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Cliente Base</label>
                <div className="bg-white border border-slate-100 rounded-2xl text-slate-900">
                    <ClientSelector onSelect={handleClientSelect} selectedClientId={formData.clienteId} />
                </div>
                
                <StableInput label="InstalaciÃ³n / Sede" icon={MapPin} value={formData.instalacion} onChange={(v: any) => handleInputChange('instalacion', v)}/>
                <StableInput label="Motor / Equipo" icon={Settings} value={formData.motor} onChange={(v: any) => handleInputChange('motor', v)}/>
                <StableInput label="N' Motor" icon={Hash} value={formData.n_motor} onChange={(v: any) => handleInputChange('n_motor', v)}/>
                <StableInput label="Grupo ElectrÃ³geno" icon={Settings} value={formData.grupo} onChange={(v: any) => handleInputChange('grupo', v)}/>
                <StableInput label="N' Grupo" icon={Hash} value={formData.n_grupo} onChange={(v: any) => handleInputChange('n_grupo', v)}/>
                <StableInput label="N' de Pedido / OC" icon={Hash} value={formData.n_pedido} onChange={(v: any) => handleInputChange('n_pedido', v)}/>
              </div>
              <div className="lg:col-span-2 space-y-2">
                 <StableInput label="Fecha" icon={Calendar} type="date" value={formData.fecha} onChange={(v: any) => handleInputChange('fecha', v)}/>
                 <StableInput label="TÃ©cnicos Intervinientes" icon={User} value={formData.tecnicos} onChange={(v: any) => handleInputChange('tecnicos', v)}/>
                 <StableInput label="H. Asistencia" icon={Clock} value={formData.h_asistencia} onChange={(v: any) => handleInputChange('h_asistencia', v)}/>
                 <StableInput label="Tipo de Servicio" icon={Type} value={formData.tipo_servicio} onChange={(v: any) => handleInputChange('tipo_servicio', v)}/>
                 <StableInput label="KilÃ³metros" icon={Car} type="number" value={formData.kms} onChange={(v: any) => handleInputChange('kms', v)}/>
                 <StableInput label="Dieta (â‚¬)" icon={Euro} type="number" value={formData.dieta} onChange={(v: any) => handleInputChange('dieta', v)}/>
                 <div className="flex items-center gap-2 pt-1.5">
                   <label className="flex items-center gap-2 text-xs font-black text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={formData.media_dieta} onChange={(e: any) => handleInputChange('media_dieta', e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded border border-slate-200" />
                      1/2 DIETA
                   </label>
                   {formData.media_dieta && <StableInput label="Cantidad" type="number" value={formData.media_dieta_cantidad} onChange={(v: any) => handleInputChange('media_dieta_cantidad', v)}/>}
                 </div>
              </div>
              <div className="lg:col-span-4 pt-2">
                <button 
                  onClick={handleCaptureLocation} 
                  disabled={locationStatus === 'loading'}
                  className={`w-full p-4 border rounded-xl font-black transition-all flex items-center justify-center gap-2 active:scale-95 text-xs ${formData.location ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 hover:border-primary text-slate-400'}`}
                >
                    {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14} /> : formData.location ? <CheckCircle2 size={14} className="text-emerald-500"/> : <MapPin size={14}/>}
                    {formData.location ? `COORDENADAS: ${formData.location.lat.toFixed(4)}, ${formData.location.lon.toFixed(4)}` : (gpsRequired ? 'VINCULAR UBICACION GPS (REQUERIDO)' : 'VINCULAR UBICACION GPS (OPCIONAL)')}
                </button>
              </div>
           </div>
        </section>
        
        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
            <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter text-black"><Settings className="text-primary" size={18}/> ParÃ¡metros TÃ©cnicos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StableInput icon={Clock} label="Horas" value={formData.parametrosTecnicos.horas} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'horas', v)} />
                <StableInput icon={Gauge} label="PresiÃ³n Aceite" value={formData.parametrosTecnicos.presionAceite} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'presionAceite', v)} />
                <StableInput icon={Zap} label="TensiÃ³n" value={formData.parametrosTecnicos.tension} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tension', v)} />
                <StableInput icon={Thermometer} label="TÂª (Â°C):" value={formData.parametrosTecnicos.temperatura} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'temperatura', v)} />
                <StableInput icon={Droplets} label="Nivel Combustible (%):" value={formData.parametrosTecnicos.nivelCombustible} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'nivelCombustible', v)} />
                <StableInput icon={Wind} label="Frecuencia (Hz):" value={formData.parametrosTecnicos.frecuencia} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'frecuencia', v)} />
                <div className="col-span-2">
                  <StableInput icon={Battery} label="TensiÃ³n baterÃ­as (V):" value={formData.parametrosTecnicos.tensionBaterias} onChange={(v: any) => handleNestedInputChange('parametrosTecnicos', 'tensionBaterias', v)} />
                </div>
            </div>
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter text-black"><Zap className="text-primary" size={18}/> Potencia con carga</h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-3 items-end">
              <div className="md:col-span-3">
                <StableInput label="Potencia con carga" value={formData.potenciaConCarga.potencia} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potencia', v)} />
              </div>
               <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">TensiÃ³n</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                      <LoadTestInput label="RS" value={formData.potenciaConCarga.tensionRS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRS', v)} />
                      <LoadTestInput label="ST" value={formData.potenciaConCarga.tensionST} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionST', v)} />
                      <LoadTestInput label="RT" value={formData.potenciaConCarga.tensionRT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'tensionRT', v)} />
                  </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">Intensidad</h4>
                   <div className="grid grid-cols-3 gap-1.5">
                      <LoadTestInput label="R" value={formData.potenciaConCarga.intensidadR} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadR', v)} />
                      <LoadTestInput label="S" value={formData.potenciaConCarga.intensidadS} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadS', v)} />
                      <LoadTestInput label="T" value={formData.potenciaConCarga.intensidadT} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'intensidadT', v)} />
                  </div>
              </div>
              <div className="md:col-span-3 space-y-2">
                  <h4 className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">Potencia (kW)</h4>
                   <LoadTestInput label="kW" value={formData.potenciaConCarga.potenciaKW} onChange={(v: any) => handleNestedInputChange('potenciaConCarga', 'potenciaKW', v)} />
              </div>
          </div>
        </section>

        <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <div className="flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-tighter text-black">Trabajos Realizados</h2>
              <button 
                onClick={improveReport} 
                disabled={aiLoading} 
                className="flex items-center gap-2 text-[8px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors active:scale-95 disabled:opacity-50"
              >
                  {aiLoading ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} 
                  {aiLoading ? 'PROCESANDO...' : 'ESTRUCTURAR CON IA'}
              </button>
          </div>
          <textarea 
            className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none font-medium text-black outline-none focus:border-primary focus:bg-white transition-all shadow-inner text-sm" 
            value={formData.trabajos_realizados} 
            onChange={(e: any) => handleInputChange('trabajos_realizados', e.target.value)} 
            placeholder="Describa aquÃ­ detalladamente las intervenciones realizadas..."
          />
       </section>
       
       <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-4 border border-slate-100">
          <h2 className="text-lg font-black flex items-center gap-2 uppercase tracking-tighter text-black"><Camera className="text-primary" size={18}/> Evidencia FotogrÃ¡fica</h2>
          <label htmlFor="image-upload" className="w-full cursor-pointer bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center hover:bg-white hover:border-primary transition-all group active:scale-[0.99]">
              <Camera size={32} className="text-slate-300 mb-1.5 group-hover:text-primary transition-colors"/>
              <span className="font-black text-slate-400 group-hover:text-slate-300 uppercase tracking-widest text-[10px]">Adjuntar ImÃ¡genes del Trabajo</span>
          </label>
          <input id="image-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange}/>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {images.map((img, i) => (
                  <div key={i} className="aspect-square relative group overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                      <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-110"/>
                  </div>
              ))}
          </div>
      </section>

      <section className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm space-y-6 border border-slate-100">
          <h2 className="text-lg font-black uppercase tracking-tighter text-black">ValidaciÃ³n y Firmas</h2>
          <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-4">
                <SignaturePad title="Firma del TÃ©cnico Inspector" signature={inspectorSignature} onSignatureEnd={setInspectorSignature} />
                <p className="text-center font-black text-slate-400 text-[8px] uppercase tracking-widest">{inspectorName}</p>
              </div>
              <div className="space-y-4">
                <SignaturePad title="Conforme Cliente / Receptor" signature={clientSignature} onSignatureEnd={setClientSignature} />
                <div className="mt-4">
                  <StableInput label="Nombre de la persona que recibe" icon={User} value={formData.recibidoPor} onChange={(v: any) => handleInputChange('recibidoPor', v)} placeholder="Nombre completo"/>
                </div>
              </div>
          </div>
      </section>

      <div className="flex flex-col md:flex-row gap-4 pt-4">
          <button 
            onClick={() => handlePdfAction(false)} 
            disabled={pdfLoading}
            className="w-full p-5 bg-white border border-slate-200 rounded-[1.5rem] font-bold flex items-center justify-center gap-3 hover:border-primary transition-all text-black shadow-md active:scale-95 disabled:opacity-50 text-sm"
          >
              {pdfLoading ? <Loader2 className="animate-spin text-primary" size={18}/> : isSaved ? <Printer size={18} className="text-primary"/> : <FileSearch size={18} className="text-primary"/>}
              {pdfLoading ? 'GENERANDO...' : isSaved ? 'IMPRIMIR HOJA FINAL' : 'VISTA PREVIA PDF'}
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || isSaved} 
            className="w-full p-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 disabled:bg-slate-700 shadow-xl active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="animate-spin text-white" size={18} /> : isSaved ? <CheckCircle2 className="text-emerald-400" size={18} /> : <Save className="text-white" size={18} />}
            {saving ? 'GUARDANDO DATOS...' : isSaved ? 'HOJA GUARDADA' : 'FINALIZAR Y GUARDAR'}
          </button>
      </div>
      </main>
    </div>
  );
}



