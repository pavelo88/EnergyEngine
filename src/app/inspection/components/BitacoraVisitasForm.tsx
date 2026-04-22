'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Loader2, Trash2, Play, StopCircle, Clock, Pencil, Camera, MapPinned, CheckCircle2, Calendar as CalendarIcon, RotateCcw, Save, X
} from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { format, subDays, isAfter, isBefore, startOfDay, differenceInMinutes, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { decimalToTime, timeToDecimal } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/offline-utils';
import { resolveInspectorEmail } from '@/lib/inspection-mode';

// --- TIPOS DE DATOS ---
type VisitaItem = {
  id: string; clienteId: string; clienteNombre: string; actividad: string;
  horaLlegada: string; horaSalida: string; ubicacionLlegada: any;
  horasNormales: number; horasExtras: number; horasEspeciales: number;
  hNormalesStr: string; hExtrasStr: string; hEspecialesStr: string;
  motorUrl?: string;
  estado: 'Registrado' | 'Aprobado';
  fecha: Date | string;
};

type ActiveStop = {
  clienteId: string; clienteNombre: string; actividad: string;
  horaLlegada: string; ubicacionLlegada: any;
};

const cleanData = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(cleanData);
  if (typeof obj === 'object') {
    if (obj instanceof Date || obj instanceof Timestamp) return obj;
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanData(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

export default function BitacoraVisitasForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = firestore ? getStorage(firestore.app) : null;
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email || '');
  const canUseCloud = isOnline && !!firestore && !!storage && !!user?.email;
  const { toast } = useToast();

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [visitas, setVisitas] = useState<VisitaItem[]>([]);
  const [activeStop, setActiveStop] = useState<ActiveStop | null>(null);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [stopTimeManual, setStopTimeManual] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);

  // Estado temporal para marcar salida
  const [tempHours, setTempHours] = useState({ normales: '', extras: '', especiales: '', motorFile: undefined as File | undefined });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditVisit, setCurrentEditVisit] = useState<any>(null);
  const [startConfig, setStartConfig] = useState({ clienteId: '', clienteNombre: '', actividad: 'Inspección' });
  const stopFileInputRef = useRef<HTMLInputElement>(null);

  // --- RECUPERAR PARADA ACTIVA ---
  useEffect(() => {
    const saved = localStorage.getItem('activeVisit_draft');
    const paused = localStorage.getItem('activeVisit_paused');
    const stopTime = localStorage.getItem('activeVisit_stopTime');

    if (saved) setActiveStop(JSON.parse(saved));
    if (paused === 'true') setIsTimerPaused(true);
    if (stopTime) setStopTimeManual(stopTime);
  }, []);

  useEffect(() => {
    if (activeStop) {
      localStorage.setItem('activeVisit_draft', JSON.stringify(activeStop));
      localStorage.setItem('activeVisit_paused', String(isTimerPaused));
      if (stopTimeManual) localStorage.setItem('activeVisit_stopTime', stopTimeManual);
      else localStorage.removeItem('activeVisit_stopTime');
    } else {
      localStorage.removeItem('activeVisit_draft');
      localStorage.removeItem('activeVisit_paused');
      localStorage.removeItem('activeVisit_stopTime');
    }
  }, [activeStop, isTimerPaused, stopTimeManual]);

  // --- CRONÓMETRO ---
  useEffect(() => {
    let interval: any;
    if (activeStop && !isTimerPaused) {
      const calculate = () => {
        const arrival = parse(activeStop.horaLlegada, 'HH:mm', new Date());
        const now = new Date();
        if (isAfter(arrival, now)) return setElapsedTime('00:00');
        const diff = differenceInMinutes(now, arrival);
        setElapsedTime(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`);
      };
      calculate();
      interval = setInterval(calculate, 60000);
    } else if (activeStop && isTimerPaused && stopTimeManual) {
      const arrival = parse(activeStop.horaLlegada, 'HH:mm', new Date());
      const stop = parse(stopTimeManual, 'HH:mm', new Date());
      const diff = differenceInMinutes(stop, arrival);
      setElapsedTime(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`);
    } else if (!activeStop) {
      setElapsedTime('00:00');
    }
    return () => clearInterval(interval);
  }, [activeStop, isTimerPaused, stopTimeManual]);

  // --- CARGAR CLIENTES ---
  useEffect(() => {
    const fetch = async () => {
      if (!firestore) return setClients(await dbLocal.clientes_cache.toArray());
      const snap = await getDocs(collection(firestore, 'clientes'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(list.sort((a: any, b: any) => (a.nombre > b.nombre ? 1 : -1)));
    };
    fetch();
  }, [firestore]);

  // --- CARGAR VISITAS DEL DÍA ---
  useEffect(() => {
    const load = async () => {
      if (!canUseCloud || !inspectorEmail) { setInitialLoading(false); return; }
      setInitialLoading(true);
      try {
        const q = query(
          collection(firestore, "bitacora_visitas"),
          where("inspectorId", "==", inspectorEmail),
          where("fechaStr", "==", format(reportDate, 'yyyy-MM-dd'))
        );
        const snap = await getDocs(q);
        setVisitas(snap.docs.map(d => ({ id: d.id, ...d.data() } as VisitaItem)));
      } catch (e) { console.error(e); }
      setInitialLoading(false);
    };
    load();
  }, [reportDate, inspectorEmail, canUseCloud, firestore]);

  const handleTimeChange = (val: string, field: 'normales' | 'extras' | 'especiales') => {
    let cleaned = val.replace(/\D/g, '').substring(0, 4);
    if (cleaned.length >= 3) cleaned = cleaned.substring(0, 2) + ':' + cleaned.substring(2);
    setTempHours({ ...tempHours, [field]: cleaned });
  };

  const handleMarcarLlegada = () => {
    if (!startConfig.clienteId) return toast({ variant: 'destructive', title: 'Selecciona cliente' });
    const setArrival = (ubicacion: any) => {
      setActiveStop({ ...startConfig, horaLlegada: format(new Date(), 'HH:mm'), ubicacionLlegada: ubicacion });
      setTempHours({ normales: '', extras: '', especiales: '', motorFile: undefined });
      setIsTimerPaused(false);
      setStopTimeManual(null);
      toast({ title: 'LLEGADA REGISTRADA ✅' });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => setArrival({ lat: p.coords.latitude, lon: p.coords.longitude }), () => setArrival(null));
    } else setArrival(null);
  };

  const handleDetenerCronometro = () => {
    setStopTimeManual(format(new Date(), 'HH:mm'));
    setIsTimerPaused(true);
    toast({ title: 'CRONÓMETRO DETENIDO ⏹️', description: 'Ahora puedes registrar tus horas.' });
  };

  const handleGuardarSalida = async () => {
    if (!activeStop || !stopTimeManual) return;

    const horaSalida = stopTimeManual;
    const decN = timeToDecimal(tempHours.normales || '00:00');
    const decE = timeToDecimal(tempHours.extras || '00:00');
    const decS = timeToDecimal(tempHours.especiales || '00:00');
    const totalDigitado = decN + decE + decS;

    // Validación estricta de diferencia de tiempo
    const arrivalDate = parse(activeStop.horaLlegada, 'HH:mm', new Date());
    const stopDate = parse(stopTimeManual, 'HH:mm', new Date());
    const diffMinutes = differenceInMinutes(stopDate, arrivalDate);
    const diffHoursTotal = diffMinutes > 0 ? diffMinutes / 60 : 0;

    if (totalDigitado > diffHoursTotal + 0.02) { // 0.02 de margen por redondeo
      return toast({
        variant: 'destructive',
        title: 'Error de Validación',
        description: `Las horas declaradas (${totalDigitado.toFixed(2)}h) exceden el tiempo real en el sitio (${diffHoursTotal.toFixed(2)}h).`
      });
    }

    if (totalDigitado <= 0) {
      return toast({ variant: 'destructive', title: 'Error', description: 'Debes declarar al menos algunas horas.' });
    }

    if (!window.confirm(`¿Guardar visita de ${activeStop.clienteNombre}? Total: ${totalDigitado.toFixed(2)}h`)) return;

    setLoading(true);
    try {
      let mUrl = '';
      if (tempHours.motorFile && canUseCloud) {
        const base64 = await fileToBase64(tempHours.motorFile);
        const fRef = ref(storage!, `visitas/${inspectorEmail}/${Date.now()}_img.png`);
        await uploadString(fRef, base64, 'data_url');
        mUrl = await getDownloadURL(fRef);
      }

      const id = `VIS-${(inspectorEmail || 'tecnico').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`; const docData: VisitaItem = {
        id, clienteId: activeStop.clienteId, clienteNombre: activeStop.clienteNombre, actividad: activeStop.actividad,
        horaLlegada: activeStop.horaLlegada, horaSalida, ubicacionLlegada: activeStop.ubicacionLlegada,
        horasNormales: decN, horasExtras: decE, horasEspeciales: decS,
        hNormalesStr: tempHours.normales || elapsedTime, hExtrasStr: tempHours.extras || '00:00', hEspecialesStr: tempHours.especiales || '00:00',
        motorUrl: mUrl || undefined, estado: 'Registrado', fecha: reportDate
      };

      await setDoc(doc(firestore!, "bitacora_visitas", id), cleanData({
        ...docData,
        inspectorId: inspectorEmail,
        inspectorNombre: user?.displayName || inspectorEmail,
        fechaStr: format(reportDate, 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      }));

      setVisitas([...visitas, docData]);
      setActiveStop(null);
      setIsTimerPaused(false);
      setStopTimeManual(null);
      toast({ title: 'VISITA REGISTRADA ✅' });
    } catch (e) { toast({ variant: 'destructive', title: 'Error al guardar' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const v = visitas.find(x => x.id === id);
    if (!v || v.estado === 'Aprobado') return toast({ variant: 'destructive', title: 'Bloqueado', description: 'Este registro ya fue aprobado por admin.' });
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await deleteDoc(doc(firestore!, "bitacora_visitas", id));
      setVisitas(visitas.filter(x => x.id !== id));
      toast({ title: 'Registro eliminado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  if (initialLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-left pb-24">
      <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg"><Clock size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Bitácora de Horas</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Horas de Atención y Visitas</p>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 rounded-2xl font-bold border-2"><CalendarIcon size={18} className="mr-2" />{format(reportDate, "d MMM yyyy", { locale: es }).toUpperCase()}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[150] bg-white border-none shadow-2xl rounded-2xl overflow-hidden"><Calendar mode="single" selected={reportDate} onSelect={(d) => d && setReportDate(d)} disabled={(d) => isAfter(d, new Date()) || isBefore(d, subDays(new Date(), 7))} className="rounded-2xl" /></PopoverContent>
        </Popover>
      </section>

      {!activeStop ? (
        <section className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-100 grid gap-4 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 mb-2">
            <MapPinned size={18} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Nueva Llegada</h3>
          </div>
          <Select value={startConfig.clienteId} onValueChange={(val) => setStartConfig({ ...startConfig, clienteId: val, clienteNombre: val === "OFICINA" ? 'OFICINA' : clients.find(c => c.id === val)?.nombre })}>
            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold"><SelectValue placeholder="SELECCIONAR CLIENTE..." /></SelectTrigger>
            <SelectContent className="z-[150] bg-white">{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={startConfig.actividad} onValueChange={(v) => setStartConfig({ ...startConfig, actividad: v })}>
            <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[150] bg-white">{['Inspección', 'Avería', 'Mantenimiento', 'Viaje', 'Oficina', 'Obra'].map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleMarcarLlegada} className="h-14 bg-slate-900 text-emerald-400 rounded-2xl font-black border-2 border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/10"><Play size={20} className="mr-2" /> INICIAR LLEGADA</Button>
        </section>
      ) : (
        <section className="bg-emerald-50 p-6 rounded-[2.5rem] border-2 border-emerald-500/20 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-emerald-100 relative z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center animate-pulse"><Clock size={20} /></div>
              <div><p className="text-[10px] font-black text-emerald-600 uppercase">En curso</p><p className="font-black text-slate-800 uppercase text-lg leading-tight">{activeStop.clienteNombre}</p></div>
            </div>
            <div className="text-right"><p className="text-3xl font-black text-emerald-600 tabular-nums tracking-tighter">{elapsedTime}h</p></div>
          </div>

          {!isTimerPaused ? (
            <Button onClick={handleDetenerCronometro} className="w-full h-16 bg-red-500 text-white rounded-2xl font-black text-lg gap-3 shadow-xl hover:bg-red-600 transition-all border-b-4 border-red-700 active:border-b-0 active:translate-y-1"><StopCircle size={24} /> DETENER CRONÓMETRO</Button>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="p-3 bg-white/50 rounded-2xl flex justify-between px-6">
                <p className="text-[10px] font-black text-slate-400 uppercase">LLEGADA: <span className="text-slate-900">{activeStop.horaLlegada}</span></p>
                <p className="text-[10px] font-black text-slate-400 uppercase">SALIDA: <span className="text-emerald-600">{stopTimeManual}</span></p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Normales</label>
                  <Input placeholder="--:--" value={tempHours.normales} onChange={e => handleTimeChange(e.target.value, 'normales')} className="h-14 rounded-2xl text-center font-black text-slate-900 border-none bg-white shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-amber-600 uppercase ml-2">Extras</label>
                  <Input placeholder="--:--" value={tempHours.extras} onChange={e => handleTimeChange(e.target.value, 'extras')} className="h-14 rounded-2xl text-center font-black text-amber-600 border-none bg-white shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-emerald-600 uppercase ml-2">Especiales</label>
                  <Input placeholder="--:--" value={tempHours.especiales} onChange={e => handleTimeChange(e.target.value, 'especiales')} className="h-14 rounded-2xl text-center font-black text-emerald-600 border-none bg-white shadow-sm" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsTimerPaused(false)} className="flex-1 h-14 rounded-2xl font-bold bg-white border-2 border-slate-200 text-slate-400 hover:text-emerald-500"><RotateCcw size={20} className="mr-2" />REANUDAR</Button>
                <Button onClick={handleGuardarSalida} disabled={loading} className="flex-[3] h-14 bg-emerald-500 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 gap-2"><Save size={20} /> GUARDAR VISITA</Button>
              </div>

              <Button variant="outline" onClick={() => stopFileInputRef.current?.click()} className={`w-full h-12 rounded-xl border-2 transition-all ${tempHours.motorFile ? 'bg-emerald-100 border-emerald-500 text-emerald-600' : 'bg-white/50 text-slate-400 border-transparent'}`}><Camera size={18} className="mr-2" /> {tempHours.motorFile ? 'EVIDENCIA ARCHIVADA' : 'ADJUNTAR FOTO (OPCIONAL)'}<input type="file" ref={stopFileInputRef} className="hidden" onChange={e => setTempHours({ ...tempHours, motorFile: e.target.files?.[0] })} /></Button>
            </div>
          )}
        </section>
      )}

      <div className="space-y-3">
        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest ml-1">Jornada Actual</h3>
        {visitas.map((v, i) => (
          <div key={v.id} className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm animate-in slide-in-from-right-4 duration-300">
            <div className="text-left">
              <div className="flex gap-2 items-center mb-1">
                <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase">{v.actividad}</span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${v.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{v.estado}</span>
              </div>
              <p className="font-bold text-slate-800 uppercase text-sm">{v.clienteNombre}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{v.horaLlegada} - {v.horaSalida}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black border border-slate-100">{v.hNormalesStr}N</span>
                {v.horasExtras > 0 && <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black border border-amber-100">{v.hExtrasStr}E</span>}
                {v.horasEspeciales > 0 && <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black border border-emerald-100">{v.hEspecialesStr}S</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {v.estado !== 'Aprobado' && (
                <>
                  <Button variant="ghost" size="icon" onClick={() => { setCurrentEditVisit(v); setIsEditModalOpen(true); }} className="text-slate-400 hover:text-blue-600 h-12 w-12 rounded-2xl hover:bg-blue-50 transition-all"><Pencil size={20} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)} className="text-red-400 hover:text-red-600 h-12 w-12 rounded-2xl hover:bg-red-50 transition-all"><Trash2 size={22} /></Button>
                </>
              )}
            </div>
          </div>
        ))}
        {visitas.length === 0 && <div className="py-12 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.3em]">Sin registros hoy</div>}
      </div>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-[2.5rem] p-8 border-none shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Editar Registro</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="rounded-full"><X size={20} /></Button>
          </div>
          {currentEditVisit && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                <p className="font-bold text-slate-800">{currentEditVisit.clienteNombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Llegada</label>
                  <Input value={currentEditVisit.horaLlegada} onChange={e => setCurrentEditVisit({ ...currentEditVisit, horaLlegada: e.target.value })} className="h-12 rounded-xl text-center font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Salida</label>
                  <Input value={currentEditVisit.horaSalida} onChange={e => setCurrentEditVisit({ ...currentEditVisit, horaSalida: e.target.value })} className="h-12 rounded-xl text-center font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Normal</label>
                  <Input value={currentEditVisit.horasNormales} onChange={e => setCurrentEditVisit({ ...currentEditVisit, horasNormales: parseFloat(e.target.value) })} type="number" className="h-12 rounded-xl text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-amber-600 uppercase ml-1">Extra</label>
                  <Input value={currentEditVisit.horasExtras} onChange={e => setCurrentEditVisit({ ...currentEditVisit, horasExtras: parseFloat(e.target.value) })} type="number" className="h-12 rounded-xl text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-emerald-600 uppercase ml-1">Esp.</label>
                  <Input value={currentEditVisit.horasEspeciales} onChange={e => setCurrentEditVisit({ ...currentEditVisit, horasEspeciales: parseFloat(e.target.value) })} type="number" className="h-12 rounded-xl text-center" />
                </div>
              </div>

              <Button
                onClick={async () => {
                  if (!canUseCloud) return toast({ variant: 'destructive', title: 'Sin conexión' });
                  setLoading(true);
                  try {
                    const total = (currentEditVisit.horasNormales || 0) + (currentEditVisit.horasExtras || 0) + (currentEditVisit.horasEspeciales || 0);
                    const docRef = doc(firestore!, "bitacora_visitas", currentEditVisit.id);
                    await updateDoc(docRef, {
                      horaLlegada: currentEditVisit.horaLlegada,
                      horaSalida: currentEditVisit.horaSalida,
                      horasNormales: currentEditVisit.horasNormales,
                      horasExtras: currentEditVisit.horasExtras,
                      horasEspeciales: currentEditVisit.horasEspeciales,
                      totalHoras: total,
                      hNormalesStr: (currentEditVisit.horasNormales || 0).toFixed(2),
                      hExtrasStr: (currentEditVisit.horasExtras || 0).toFixed(2),
                      hEspecialesStr: (currentEditVisit.horasEspeciales || 0).toFixed(2)
                    });

                    setVisitas(prev => prev.map(v => v.id === currentEditVisit.id ? {
                      ...v,
                      ...currentEditVisit,
                      hNormalesStr: (currentEditVisit.horasNormales || 0).toFixed(2),
                      hExtrasStr: (currentEditVisit.horasExtras || 0).toFixed(2),
                      hEspecialesStr: (currentEditVisit.horasEspeciales || 0).toFixed(2)
                    } : v));

                    setIsEditModalOpen(false);
                    toast({ title: 'Actualizado correctamente ✅' });
                  } catch (e) {
                    console.error(e);
                    toast({ variant: 'destructive', title: 'Error al actualizar' });
                  } finally { setLoading(false); }
                }}
                disabled={loading}
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'GUARDAR CAMBIOS'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
