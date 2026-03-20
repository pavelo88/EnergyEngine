'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Save, Loader2, Euro, Trash2, Plus, FileText, ClipboardSignature,
  Camera, Calendar as CalendarIcon, MapPin, CheckCircle2, Check,
  MapPinned, Eye, Play, StopCircle, Clock
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { collection, serverTimestamp, doc, getDoc, setDoc, updateDoc, getDocs } from 'firebase/firestore';
import { format, subDays, isAfter, isBefore, startOfDay, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { useToast } from '@/hooks/use-toast';
import SignaturePad from './SignaturePad';
import { fileToBase64 } from '@/lib/offline-utils';
import { resolveInspectorEmail } from '@/lib/inspection-mode';

// --- HELPER DE TIEMPOS ---
const timeToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) + ((m || 0) / 60);
};

const decimalToTime = (dec: number): string => {
  if (!dec) return "00:00";
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// --- TIPOS DE DATOS ---
type GastoItem = {
  rubro: string; monto: number; descripcion: string; forma_pago: string; hora: string;
  comprobanteUrl?: string; comprobanteBase64?: string; comprobanteFileName?: string; comprobanteMimeType?: string;
};

type Stop = {
  id: string; clienteId: string; clienteNombre: string; actividad: string;
  horaLlegada: string; horaSalida: string; ubicacionLlegada: any;
  horasNormales: number; horasExtras: number; horasEspeciales: number;
  hNormalesStr: string; hExtrasStr: string; hEspecialesStr: string;
  motorUrl?: string; motorBase64?: string; motorFileName?: string; motorMimeType?: string;
};

type ActiveStop = {
  clienteId: string; clienteNombre: string; actividad: string;
  horaLlegada: string; ubicacionLlegada: any;
};

const initialGastoState = { rubro: 'Combustible', monto: '', descripcion: '', forma_pago: 'Tarjeta Empresa', hora: format(new Date(), 'HH:mm'), comprobanteFile: undefined };

export default function RegistroGastoForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = firestore ? getStorage(firestore.app) : null;
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email || '');
  const canUseCloud = isOnline && !!firestore && !!storage && !!user?.email;
  const { toast } = useToast();

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [observacionesDiarias, setObservacionesDiarias] = useState('');

  // --- ESTADOS DE PARADA ---
  const [stops, setStops] = useState<Stop[]>([]);
  const [activeStop, setActiveStop] = useState<ActiveStop | null>(null);

  // Estado temporal para los inputs de horas cuando se va a marcar salida
  const [tempHours, setTempHours] = useState({ normales: '00:00', extras: '00:00', especiales: '00:00', motorFile: undefined as File | undefined });
  const stopFileInputRef = useRef<HTMLInputElement>(null);

  // Estado temporal para iniciar la llegada
  const [startConfig, setStartConfig] = useState({ clienteId: '', clienteNombre: '', actividad: 'Inspección' });

  const [clients, setClients] = useState<any[]>([]);
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [existingFirmaUrl, setExistingFirmaUrl] = useState<string | null>(null);

  const [showPreview, setShowPreview] = useState(false);

  // --- PERSISTENCIA LOCAL DE PARADA ACTIVA ---
  useEffect(() => {
    const savedActiveStop = localStorage.getItem('activeStop_draft');
    if (savedActiveStop) setActiveStop(JSON.parse(savedActiveStop));
  }, []);

  useEffect(() => {
    if (activeStop) localStorage.setItem('activeStop_draft', JSON.stringify(activeStop));
    else localStorage.removeItem('activeStop_draft');
  }, [activeStop]);

  /*
  // TODO: BLOQUEO DE CIERRE DE APP SI HAY PARADA ACTIVA
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeStop) {
        e.preventDefault();
        e.returnValue = 'Wey, marca la salida antes de cerrar la app';
        return 'Wey, marca la salida antes de cerrar la app';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeStop]);
  */

  // --- CARGAR CLIENTES ---
  useEffect(() => {
    const fetchClients = async () => {
      if (!firestore) { setClients(await dbLocal.clientes_cache.toArray()); return; }
      try {
        const snap = await getDocs(collection(firestore, 'clientes'));
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setClients(list.sort((a, b) => (a.nombre > b.nombre ? 1 : -1)));
        await dbLocal.clientes_cache.bulkPut(list as any);
      } catch (e) { setClients(await dbLocal.clientes_cache.toArray()); }
    };
    fetchClients();
  }, [firestore]);

  // --- RECUPERAR JORNADA ---
  useEffect(() => {
    const loadDailyData = async () => {
      if (!canUseCloud || !inspectorEmail) { setInitialLoading(false); return; }
      setInitialLoading(true);
      const fechaID = format(reportDate, 'yyyy-MM-dd');
      const reportId = `GASTO-${inspectorEmail.replace(/[^a-zA-Z0-9]/g, '')}-${fechaID}`;

      try {
        const docRef = doc(firestore, "gastos", reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const loadedStops = (data.itinerario || []).map((s: any) => ({
            ...s,
            hNormalesStr: s.hNormalesStr || decimalToTime(s.horasNormales),
            hExtrasStr: s.hExtrasStr || decimalToTime(s.horasExtras),
            hEspecialesStr: s.hEspecialesStr || decimalToTime(s.horasEspeciales),
          }));
          setStops(loadedStops);
          setGastos(data.gastos || []);
          setObservacionesDiarias(data.observaciones || '');
          setExistingFirmaUrl(data.firmaUrl || null);
        } else {
          setStops([]); setGastos([]); setObservacionesDiarias(''); setExistingFirmaUrl(null);
        }
      } catch (error) { console.error("Error", error); }
      setInitialLoading(false);
    };

    loadDailyData();
  }, [reportDate, inspectorEmail, canUseCloud, firestore]);

  // --- LÓGICA DE PARADAS: LLEGADA ---
  const handleMarcarLlegada = () => {
    if (!startConfig.clienteId) {
      toast({ variant: 'destructive', title: 'Selecciona un cliente' });
      return;
    }

    const setArrival = (ubicacion: any) => {
      setActiveStop({
        clienteId: startConfig.clienteId,
        clienteNombre: startConfig.clienteNombre,
        actividad: startConfig.actividad,
        horaLlegada: format(new Date(), 'HH:mm'),
        ubicacionLlegada: ubicacion
      });
      setTempHours({ normales: '00:00', extras: '00:00', especiales: '00:00', motorFile: undefined });
      toast({ title: 'LLEGADA REGISTRADA', description: 'El contador de tiempo ha iniciado.' });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setArrival({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setArrival(null)
      );
    } else {
      setArrival(null);
    }
  };

  // --- LÓGICA DE PARADAS: SALIDA ---
  const handleMarcarSalida = async () => {
    if (!activeStop) return;

    const decN = timeToDecimal(tempHours.normales);
    const decE = timeToDecimal(tempHours.extras);
    const decS = timeToDecimal(tempHours.especiales);
    const totalDigitado = decN + decE + decS;

    const horaSalida = format(new Date(), 'HH:mm');

    // Validación Matemática de Tiempos
    const arrivalDate = parse(activeStop.horaLlegada, 'HH:mm', new Date());
    const departureDate = parse(horaSalida, 'HH:mm', new Date());
    const diffMinutes = differenceInMinutes(departureDate, arrivalDate);
    const diffHours = diffMinutes > 0 ? diffMinutes / 60 : 0;

    if (totalDigitado > diffHours) {
      toast({
        variant: 'destructive',
        title: 'Error de Tiempos',
        description: `No puedes declarar ${totalDigitado.toFixed(1)}h si solo estuviste ${diffHours.toFixed(1)}h en el punto.`
      });
      return;
    }

    let base64 = ''; let fName = ''; let fType = '';
    if (tempHours.motorFile) {
      base64 = await fileToBase64(tempHours.motorFile);
      fName = tempHours.motorFile.name; fType = tempHours.motorFile.type;
    }

    const newStop: Stop = {
      id: `stop-${Date.now()}`,
      clienteId: activeStop.clienteId,
      clienteNombre: activeStop.clienteNombre,
      actividad: activeStop.actividad,
      horaLlegada: activeStop.horaLlegada,
      horaSalida: horaSalida,
      ubicacionLlegada: activeStop.ubicacionLlegada,
      horasNormales: decN, horasExtras: decE, horasEspeciales: decS,
      hNormalesStr: tempHours.normales, hExtrasStr: tempHours.extras, hEspecialesStr: tempHours.especiales,
      motorBase64: base64, motorFileName: fName, motorMimeType: fType,
    };

    setStops([...stops, newStop]);
    setActiveStop(null); // Cierra la parada
    setStartConfig({ clienteId: '', clienteNombre: '', actividad: 'Inspección' });
    if (stopFileInputRef.current) stopFileInputRef.current.value = '';
    toast({ title: 'SALIDA REGISTRADA', description: `Se han sumado ${totalDigitado.toFixed(1)}h a tu jornada.` });
  };

  // --- LÓGICA DE GASTOS ---
  const handleAddGasto = async () => {
    if (!currentGasto.monto || !currentGasto.descripcion || !currentGasto.hora) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'Monto, concepto y hora son obligatorios.' });
      return;
    }
    let gastoToAdd: any = { ...currentGasto, monto: parseFloat(currentGasto.monto) };
    if (currentGasto.comprobanteFile) {
      const base64 = await fileToBase64(currentGasto.comprobanteFile);
      gastoToAdd.comprobanteBase64 = base64;
      gastoToAdd.comprobanteFileName = currentGasto.comprobanteFile.name;
      gastoToAdd.comprobanteMimeType = currentGasto.comprobanteFile.type;
    }
    setGastos([...gastos, gastoToAdd]);
    setCurrentGasto(initialGastoState);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast({ title: 'GASTO REGISTRADO', description: `Añadido: ${gastoToAdd.monto}€` });
  };

  const totalGastosSesion = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);
  const totalHorasSesion = useMemo(() => stops.reduce((acc, curr) => acc + curr.horasNormales + curr.horasExtras + curr.horasEspeciales, 0), [stops]);

  // --- GUARDADO GENERAL FIREBASE ---
  const handleSaveReport = async () => {
    if (activeStop) {
      toast({ variant: 'destructive', title: 'Parada Abierta', description: 'Debes marcar la salida de tu punto actual antes de enviar el reporte.' });
      return;
    }
    setShowPreview(false);
    if (!inspectorEmail || (!signature && !existingFirmaUrl)) {
      toast({ variant: 'destructive', title: 'Firma requerida', description: 'Por favor, firma el reporte o usa la firma existente.' });
      return;
    }

    setLoading(true);
    const fechaID = format(reportDate, 'yyyy-MM-dd');
    const reportId = `GASTO-${inspectorEmail.replace(/[^a-zA-Z0-9]/g, '')}-${fechaID}`;

    try {
      if (canUseCloud && firestore && storage) {

        let firmaUrl = existingFirmaUrl;
        if (signature) {
          const signatureRef = ref(storage, `firmas_gastos/${reportId}_${Date.now()}.png`);
          await uploadString(signatureRef, signature, 'data_url');
          firmaUrl = await getDownloadURL(signatureRef);
        }

        const formattedStops = [];
        for (const s of stops) {
          let mUrl = s.motorUrl || '';
          if (s.motorBase64) {
            const byteString = atob(s.motorBase64.split(',')[1]);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
            const blob = new Blob([byteArray], { type: s.motorMimeType });
            const sRef = ref(storage, `evidencias_paradas/${reportId}/${Date.now()}_${s.motorFileName}`);
            await uploadBytes(sRef, blob);
            mUrl = await getDownloadURL(sRef);
          }
          formattedStops.push({
            id: s.id, clienteId: s.clienteId, clienteNombre: s.clienteNombre,
            actividad: s.actividad, horaLlegada: s.horaLlegada, horaSalida: s.horaSalida, ubicacionLlegada: s.ubicacionLlegada,
            horasNormales: s.horasNormales, horasExtras: s.horasExtras, horasEspeciales: s.horasEspeciales,
            hNormalesStr: s.hNormalesStr, hExtrasStr: s.hExtrasStr, hEspecialesStr: s.hEspecialesStr,
            motorUrl: mUrl, hora: `${s.horaLlegada} - ${s.horaSalida}` // Para retrocompatibilidad
          });
        }

        const formattedGastos = [];
        for (const g of gastos) {
          let cUrl = g.comprobanteUrl || '';
          if (g.comprobanteBase64) {
            const byteString = atob(g.comprobanteBase64.split(',')[1]);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
            const blob = new Blob([byteArray], { type: g.comprobanteMimeType });
            const fRef = ref(storage, `comprobantes_gastos/${reportId}/${Date.now()}_${g.comprobanteFileName}`);
            await uploadBytes(fRef, blob);
            cUrl = await getDownloadURL(fRef);
          }
          formattedGastos.push({
            rubro: g.rubro, monto: g.monto, descripcion: g.descripcion, forma_pago: g.forma_pago,
            horaGasto: g.hora, comprobanteUrl: cUrl, fecha: reportDate
          });
        }

        const docRef = doc(firestore, "gastos", reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          await updateDoc(docRef, {
            itinerario: formattedStops,
            gastos: formattedGastos,
            total: totalGastosSesion,
            observaciones: observacionesDiarias,
            ultimaActualizacion: serverTimestamp(),
            ...(firmaUrl ? { firmaUrl } : {})
          });
        } else {
          await setDoc(docRef, {
            id: reportId, inspectorId: inspectorEmail, inspectorNombre: user?.displayName || inspectorEmail,
            fecha: reportDate, itinerario: formattedStops, gastos: formattedGastos,
            observaciones: observacionesDiarias, firmaUrl, total: totalGastosSesion,
            estado: 'Pendiente de Aprobación', fecha_creacion: serverTimestamp()
          });
        }
      } else {
        await dbLocal.table('gastos_report' as any).add({
          reportId, synced: false, data: { stops, gastos, signature, reportDate, observacionesDiarias }, createdAt: new Date()
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setSignature(null);
        setIsSuccess(false);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2000);

    } catch (e) {
      toast({ variant: 'destructive', title: 'Error Crítico', description: 'No se pudo guardar. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
        <p className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Recuperando Jornada...</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-200">
          <Check size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">¡REGISTRO COMPLETADO!</h2>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Jornada Sincronizada Exitosamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-slate-50 p-4 text-left">
      <main className="max-w-4xl mx-auto space-y-8 pb-40">

        {/* CABECERA Y FECHA */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg"><Clock size={24} className="text-emerald-400" /></div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Bitácora Diaria</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <p className="text-slate-400 text-[9px] font-black tracking-widest uppercase">
                    {isOnline ? 'Sincronizado' : 'Modo Offline Activado'}
                  </p>
                </div>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-12 px-6 rounded-2xl flex items-center gap-3 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm">
                  <CalendarIcon size={18} /> {format(reportDate, "d MMM yyyy", { locale: es }).toUpperCase()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl z-[150] bg-white border-2 border-slate-900 shadow-2xl">
                <Calendar
                  mode="single"
                  selected={reportDate}
                  onSelect={(date) => date && setReportDate(date)}
                  disabled={(date) => isAfter(date, new Date()) || isBefore(date, startOfDay(subDays(new Date(), 7)))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* --- RELOJ CHECADOR --- */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MapPinned size={20} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter">Tiempos de Atención</h3>
          </div>

          {!activeStop ? (
            // PASO 1: MARCAR LLEGADA
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">¿Dónde estás?</label>
                <Select value={startConfig.clienteId} onValueChange={(val) => {
                  const c = clients.find(cl => cl.id === val);
                  setStartConfig({ ...startConfig, clienteId: val, clienteNombre: val === "OFICINA" ? 'OFICINA CENTRAL' : (c?.nombre || 'Cliente Desconocido') });
                }}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue placeholder="SELECCIONAR CLIENTE..." /></SelectTrigger>
                  <SelectContent className="max-h-60 rounded-xl bg-white z-[150]">
                    <SelectItem value="OFICINA" className="font-bold uppercase">OFICINA CENTRAL</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id} className="font-medium uppercase">{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">¿Qué vas a hacer?</label>
                <Select value={startConfig.actividad} onValueChange={(v) => setStartConfig({ ...startConfig, actividad: v })}>
                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl bg-white z-[150]">
                    {['Inspección', 'Avería', 'Mantenimiento', 'Entrega', 'Obra', 'Viaje', 'Otros'].map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleMarcarLlegada} className="w-full h-14 bg-slate-900 text-emerald-400 rounded-2xl font-black hover:bg-slate-800 active:scale-95 transition-all flex gap-2 shadow-lg">
                  <Play size={20} /> MARCAR LLEGADA
                </Button>
              </div>
            </div>
          ) : (
            // PASO 2: MARCAR SALIDA
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50 p-5 rounded-3xl border-2 border-emerald-500/20">
              <div className="md:col-span-3 flex items-center justify-between bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">En Curso</p>
                  <p className="font-black text-slate-900 uppercase text-lg leading-none mt-1">{activeStop.clienteNombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora de Llegada</p>
                  {/* Input editable solo para que puedas probar la matemática sin esperar 3 horas reales */}
                  <Input type="time" value={activeStop.horaLlegada} onChange={(e) => setActiveStop({ ...activeStop, horaLlegada: e.target.value })} className="h-8 mt-1 font-black text-emerald-600 bg-emerald-50 border-none text-right" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 text-left block">H. Normales</label>
                <Input type="time" value={tempHours.normales} onChange={e => setTempHours({ ...tempHours, normales: e.target.value })} className="h-14 rounded-2xl border-slate-200 bg-white font-black text-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1 text-left block">H. Extras</label>
                <Input type="time" value={tempHours.extras} onChange={e => setTempHours({ ...tempHours, extras: e.target.value })} className="h-14 rounded-2xl border-amber-200 bg-white font-black text-amber-600 focus-visible:ring-amber-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 text-left block">H. Especiales</label>
                <Input type="time" value={tempHours.especiales} onChange={e => setTempHours({ ...tempHours, especiales: e.target.value })} className="h-14 rounded-2xl border-emerald-200 bg-white font-black text-emerald-600 focus-visible:ring-emerald-500" />
              </div>

              <div className="flex gap-2 md:col-span-3 pt-2">
                <Button variant="outline" onClick={() => stopFileInputRef.current?.click()} className={`flex-1 h-14 rounded-2xl border-2 font-bold transition-all shadow-sm ${tempHours.motorFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                  <Camera size={18} className="mr-2" /> {tempHours.motorFile ? 'FOTO OK' : 'FOTO EQUIPO (Opcional)'}
                  <input type="file" ref={stopFileInputRef} onChange={(e) => e.target.files?.[0] && setTempHours({ ...tempHours, motorFile: e.target.files[0] })} accept="image/*" capture="environment" className="hidden" />
                </Button>
                <Button onClick={handleMarcarSalida} className="flex-[2] h-14 bg-emerald-500 text-slate-900 rounded-2xl font-black hover:bg-emerald-400 active:scale-95 transition-all flex gap-2 shadow-lg">
                  <StopCircle size={20} /> MARCAR SALIDA
                </Button>
              </div>
            </div>
          )}

          {/* LISTA DE PARADAS CERRADAS */}
          <div className="space-y-3 pt-4">
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-black text-xs">{i + 1}</div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 uppercase text-sm">{s.clienteNombre}</p>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{s.actividad} • {s.horaLlegada} a {s.horaSalida}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black">{s.hNormalesStr} N</span>
                      {s.horasExtras > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-black">{s.hExtrasStr} E</span>}
                      {s.horasEspeciales > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black">{s.hEspecialesStr} S</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setStops(stops.filter(st => st.id !== s.id))} className="text-red-400 hover:text-red-600 rounded-full"><Trash2 size={20} /></Button>
              </div>
            ))}
          </div>
        </section>

        {/* GASTOS INDEPENDIENTES */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Euro size={18} className="text-emerald-500" /> Gastos y Tickets</h3>
            {totalGastosSesion > 0 && <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-sm border border-emerald-100">ACTUAL: {totalGastosSesion.toFixed(2)} €</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Hora del Gasto</label>
              <Input type="time" value={currentGasto.hora} onChange={e => setCurrentGasto({ ...currentGasto, hora: e.target.value })} className="h-14 rounded-2xl border-slate-200 bg-white font-black text-slate-900" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Monto (€)</label>
              <Input type="number" placeholder="0.00" value={currentGasto.monto} onChange={e => setCurrentGasto({ ...currentGasto, monto: e.target.value })} className="h-14 rounded-2xl border-emerald-200 bg-white font-black text-xl text-emerald-600 focus-visible:ring-emerald-500" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Categoría</label>
              <Select value={currentGasto.rubro} onValueChange={v => setCurrentGasto({ ...currentGasto, rubro: v })}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl bg-white z-[150]">
                  {['Combustible', 'Peajes', 'Parking', 'Manutención', 'Hospedaje', 'Otros'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Forma de Pago</label>
              <Select value={currentGasto.forma_pago} onValueChange={v => setCurrentGasto({ ...currentGasto, forma_pago: v })}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl bg-white z-[150]">
                  {['Tarjeta Empresa', 'Efectivo', 'Transferencia', 'Tarjeta Personal'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Concepto / Referencia</label>
              <Input placeholder="Ej: Ticket Gasolinera" value={currentGasto.descripcion} onChange={e => setCurrentGasto({ ...currentGasto, descripcion: e.target.value })} className="h-14 rounded-2xl border-slate-200 bg-white font-medium text-slate-900" />
            </div>
            <div className="flex gap-2 md:col-span-2 pt-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-14 rounded-2xl border-2 font-bold transition-all shadow-sm ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                <Camera size={18} className="mr-2" /> {currentGasto.comprobanteFile ? 'TICKET OK' : 'FOTO TICKET (Opcional)'}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setCurrentGasto({ ...currentGasto, comprobanteFile: e.target.files[0] })} accept="image/*" capture="environment" className="hidden" />
              </Button>
              <Button onClick={handleAddGasto} className="flex-[2] h-14 bg-emerald-500 text-slate-900 rounded-2xl font-black shadow-lg hover:bg-emerald-400 transition-all flex gap-2">
                <Plus size={18} /> AÑADIR GASTO
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {gastos.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-3 rounded-xl ${g.comprobanteBase64 || g.comprobanteUrl ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><FileText size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm uppercase leading-tight">{g.descripcion}</p>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">{g.hora} • {g.rubro} • {g.forma_pago}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-black text-emerald-600 text-lg">{g.monto.toFixed(2)}€</p>
                  <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VALIDACIÓN Y BOTONES FINALES */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Observaciones Generales</label>
            <textarea
              className="w-full p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 font-medium text-slate-700 min-h-[100px] focus:border-emerald-500 outline-none transition-all"
              placeholder="Notas adicionales sobre la jornada..."
              value={observacionesDiarias}
              onChange={(e) => setObservacionesDiarias(e.target.value)}
            />
          </div>

          <div className="flex flex-col items-center gap-2 py-4">
            <ClipboardSignature size={32} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Validación Final</h3>
          </div>

          <SignaturePad title="Firma del Inspector" signature={signature} onSignatureEnd={setSignature} />

          <div className="pt-8 flex flex-col md:flex-row gap-4">
            <Button
              onClick={() => {
                if (stops.length === 0 && gastos.length === 0) {
                  toast({ variant: 'destructive', title: 'Reporte Vacío', description: 'No hay nada que previsualizar.' });
                  return;
                }
                setShowPreview(true);
              }}
              variant="outline"
              className="flex-1 h-16 rounded-2xl border-2 border-slate-900 font-black text-slate-900 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Eye size={20} /> PREVISUALIZAR JORNADA
            </Button>

            <Button
              onClick={handleSaveReport}
              disabled={loading || (!signature && !existingFirmaUrl) || (stops.length === 0 && gastos.length === 0)}
              className="flex-1 h-16 bg-slate-900 text-emerald-400 rounded-2xl font-black text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
              {loading ? 'Sincronizando...' : 'GUARDAR DIRECTO'}
            </Button>
          </div>
        </section>

      </main>

      {/* MODAL DE PREVISUALIZACIÓN */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none bg-slate-50 shadow-2xl text-left">
          <DialogHeader className="bg-slate-900 p-8 rounded-t-[2rem]">
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tighter">Resumen de la Jornada</DialogTitle>
            <DialogDescription className="text-emerald-400 font-bold text-xs uppercase tracking-widest mt-1">Revisa los datos antes de guardar</DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            {/* Resumen Paradas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Desglose de Horas</h3>
              <div className="space-y-2 mb-4">
                {stops.map(s => (
                  <div key={s.id} className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-xs uppercase">{s.clienteNombre}</span>
                    <span className="font-black text-slate-900 text-xs">{(s.horasNormales + s.horasExtras + s.horasEspeciales).toFixed(2)}h Totales</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL HORAS SESIÓN</p>
                <p className="text-2xl font-black text-slate-900">{totalHorasSesion.toFixed(2)}h</p>
              </div>
            </div>

            {/* Resumen Gastos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Desglose de Gastos</h3>
              <div className="space-y-2 mb-4">
                {gastos.map((g, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-xs uppercase">{g.rubro} ({g.forma_pago})</span>
                    <span className="font-black text-emerald-600 text-xs">{g.monto.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl text-center border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">TOTAL GASTOS APROBADOS</p>
                <p className="text-3xl font-black text-emerald-600">{totalGastosSesion.toFixed(2)}€</p>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button onClick={() => setShowPreview(false)} variant="outline" className="w-full md:w-auto font-bold uppercase rounded-xl">Revisar de nuevo</Button>
              <Button onClick={handleSaveReport} disabled={loading || (!signature && !existingFirmaUrl)} className="w-full md:w-auto bg-emerald-500 text-slate-900 hover:bg-emerald-400 font-black uppercase rounded-xl shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 className="mr-2" size={16} />}
                FIRMAR Y GUARDAR
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}