'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Save, Loader2, User, Euro, Trash2, Plus,
  FileText, ClipboardSignature, Camera, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertTriangle,
  Clock, Navigation, Building2, MapPinned, Check
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { collection, serverTimestamp, doc, getDoc, setDoc, updateDoc, arrayUnion, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as dbLocal } from '@/lib/db-local';
import { useToast } from '@/hooks/use-toast';
import SignaturePad from './SignaturePad';
import { fileToBase64 } from '@/lib/offline-utils';
import { resolveInspectorEmail } from '@/lib/inspection-mode';

// --- TIPOS DE DATOS ---
type GastoItem = {
  rubro: string;
  monto: number;
  descripcion: string;
  forma_pago: string;
  stopId: string;
  comprobanteUrl?: string;
  comprobanteBase64?: string;
  comprobanteFileName?: string;
  comprobanteMimeType?: string;
};

type Stop = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  actividad: string;
  hora: string;
  ubicacion: { lat: number, lon: number } | null;
};

const initialGastoState = { rubro: 'Alimentación', monto: '', descripcion: '', forma_pago: 'Tarjeta Empresa', stopId: 'general', comprobanteFile: undefined };
const initialStopState = { clienteId: '', clienteNombre: '', actividad: 'Inspección', hora: format(new Date(), 'HH:mm') };

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
  const [stops, setStops] = useState<Stop[]>([]);
  const [currentStop, setCurrentStop] = useState<any>(initialStopState);
  const [clients, setClients] = useState<any[]>([]);
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar Clientes (Caché local + Firestore)
  useEffect(() => {
    const fetchClients = async () => {
      if (!firestore) {
        setClients(await dbLocal.clientes_cache.toArray());
        return;
      }
      try {
        const snap = await getDocs(collection(firestore, 'clientes'));
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setClients(list.sort((a, b) => (a.nombre > b.nombre ? 1 : -1)));
        await dbLocal.clientes_cache.bulkPut(list as any);
      } catch (e) {
        setClients(await dbLocal.clientes_cache.toArray());
      }
    };
    fetchClients();
  }, [firestore]);

  const handleAddStop = () => {
    if (!currentStop.clienteId) {
      toast({ variant: 'destructive', title: 'Selecciona un cliente' });
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newStop: Stop = {
          ...currentStop,
          id: `stop-${Date.now()}`,
          hora: format(new Date(), 'HH:mm'),
          ubicacion: { lat: pos.coords.latitude, lon: pos.coords.longitude }
        };
        setStops([...stops, newStop]);
        setCurrentStop(initialStopState);
        toast({ title: 'PARADA REGISTRADA', description: `Ubicación GPS guardada para ${currentStop.clienteNombre}` });
      }, () => {
        const newStop: Stop = { ...currentStop, id: `stop-${Date.now()}`, hora: format(new Date(), 'HH:mm'), ubicacion: null };
        setStops([...stops, newStop]);
        setCurrentStop(initialStopState);
        toast({ title: 'PARADA SIN GPS', description: 'No se pudo obtener la ubicación, parada guardada sin coordenadas.' });
      });
    }
  };

  const handleAddGasto = async () => {
    if (!currentGasto.monto || !currentGasto.descripcion) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'Monto y concepto son obligatorios.' });
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
  };

  const totalGastosSesion = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);

  const handleSaveReport = async () => {
    if (!inspectorEmail || !signature) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor, firma el reporte para finalizar.' });
      return;
    }
    if (stops.length === 0 && gastos.length === 0) {
      toast({ variant: 'destructive', title: 'Reporte vacío', description: 'Debes añadir al menos una parada o un gasto.' });
      return;
    }

    setLoading(true);
    const fechaID = format(reportDate, 'yyyy-MM-dd');
    const reportId = `GASTO-${inspectorEmail.replace(/[^a-zA-Z0-9]/g, '')}-${fechaID}`;

    try {
      if (canUseCloud && firestore && storage) {
        // 1. Subir Firma
        const signatureRef = ref(storage, `firmas_gastos/${reportId}_${Date.now()}.png`);
        await uploadString(signatureRef, signature, 'data_url');
        const firmaUrl = await getDownloadURL(signatureRef);

        // 2. Subir Comprobantes
        const formattedGastos = [];
        for (const g of gastos) {
          let cUrl = '';
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
            rubro: g.rubro,
            monto: g.monto,
            descripcion: g.descripcion,
            forma_pago: g.forma_pago,
            stopId: g.stopId,
            comprobanteUrl: cUrl,
            clienteNombre: stops.find(s => s.id === g.stopId)?.clienteNombre || 'Gasto General',
            fecha: reportDate
          });
        }

        // 3. Guardado Incremental en Firestore
        const docRef = doc(firestore, "gastos", reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dataActual = docSnap.data();
          await updateDoc(docRef, {
            itinerario: arrayUnion(...stops),
            gastos: arrayUnion(...formattedGastos),
            total: (dataActual.total || 0) + totalGastosSesion,
            observaciones: (dataActual.observaciones ? dataActual.observaciones + " | " : "") + observacionesDiarias,
            ultimaActualizacion: serverTimestamp(),
            firmaUrl // Actualizamos con la firma más reciente
          });
        } else {
          await setDoc(docRef, {
            id: reportId,
            inspectorId: inspectorEmail,
            inspectorNombre: user?.displayName || inspectorEmail,
            fecha: reportDate,
            itinerario: stops,
            gastos: formattedGastos,
            observaciones: observacionesDiarias,
            firmaUrl,
            total: totalGastosSesion,
            estado: 'Pendiente de Aprobación',
            fecha_creacion: serverTimestamp()
          });
        }
        toast({ title: '¡SINCRO EXITOSA!', description: 'Tus datos están a salvo en la nube.' });
      } else {
        // MODO OFFLINE
        await dbLocal.table('gastos_report' as any).add({
          reportId, synced: false, data: { stops, gastos, signature, reportDate, observacionesDiarias }, createdAt: new Date()
        });
        toast({ title: 'GUARDADO EN DISPOSITIVO', description: 'Sin conexión. Se subirá automáticamente al recuperar internet.' });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setStops([]);
        setGastos([]);
        setSignature(null);
        setObservacionesDiarias('');
        setIsSuccess(false);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 2000);

    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error Crítico', description: 'No se pudo guardar. Intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-emerald-200">
          <Check size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">¡REGISTRO COMPLETADO!</h2>
        <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Energy Engine Management System</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-slate-50 p-4 text-left">
      <main className="max-w-4xl mx-auto space-y-8 pb-40">
        
        {/* CABECERA CON STATUS */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100"><Euro size={24} /></div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Registro de Gastos</h2>
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
                <Button variant="outline" className="h-12 px-6 rounded-2xl flex items-center gap-3 font-bold text-slate-700 bg-slate-50 border-2 border-slate-100 hover:border-emerald-500 transition-all shadow-sm">
                  <CalendarIcon size={18} className="text-emerald-500" /> {format(reportDate, "d MMM yyyy", { locale: es }).toUpperCase()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl z-[150] bg-white border-none shadow-2xl">
                <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* ITINERARIO */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MapPinned size={20} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter">Itinerario y Paradas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Cliente / Instalación</label>
              <Select value={currentStop.clienteId} onValueChange={(val) => {
                  const c = clients.find(cl => cl.id === val);
                  setCurrentStop({ ...currentStop, clienteId: val, clienteNombre: val === "OFICINA" ? 'OFICINA CENTRAL' : (c?.nombre || 'Cliente Desconocido') });
              }}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900 text-left">
                  <SelectValue placeholder="SELECCIONAR CLIENTE..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl bg-white z-[150]">
                  <SelectItem value="OFICINA" className="font-bold uppercase">OFICINA CENTRAL</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id} className="font-medium uppercase">{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Actividad</label>
              <Select value={currentStop.actividad} onValueChange={(v) => setCurrentStop({ ...currentStop, actividad: v })}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl bg-white z-[150]">
                  {['Inspección', 'Avería', 'Mantenimiento', 'Entrega', 'Obra', 'Otros'].map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddStop} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black md:col-span-3 hover:bg-slate-800 active:scale-95 transition-all flex gap-2">
              <Navigation size={18} className="text-emerald-400" /> REGISTRAR PARADA AHORA
            </Button>
          </div>

          <div className="space-y-3">
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm animate-in slide-in-from-left duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xs">{i + 1}</div>
                  <div className="text-left">
                    <p className="font-bold text-slate-800 uppercase text-sm">{s.clienteNombre}</p>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{s.actividad} • {s.hora} • {s.ubicacion ? 'GPS OK' : 'SIN GPS'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setStops(stops.filter(st => st.id !== s.id))} className="text-red-400 hover:text-red-600 rounded-full"><Trash2 size={20} /></Button>
              </div>
            ))}
            {stops.length === 0 && <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">No se han registrado paradas hoy</div>}
          </div>
        </section>

        {/* GASTOS */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><Euro size={18} className="text-emerald-500" /> Gastos y Tickets</h3>
            {totalGastosSesion > 0 && <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-sm border border-emerald-100">ACTUAL: {totalGastosSesion.toFixed(2)} €</div>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Monto (€)</label>
              <Input type="number" placeholder="0.00" value={currentGasto.monto} onChange={e => setCurrentGasto({ ...currentGasto, monto: e.target.value })} className="h-14 rounded-2xl border-slate-200 bg-white font-black text-xl text-emerald-600" />
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
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Vincular a Parada</label>
              <Select value={currentGasto.stopId} onValueChange={v => setCurrentGasto({ ...currentGasto, stopId: v })}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl bg-white z-[150]">
                  <SelectItem value="general" className="font-bold">GASTO GENERAL</SelectItem>
                  {stops.map((s, i) => <SelectItem key={s.id} value={s.id}>PARADA {i + 1}: {s.clienteNombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left block">Concepto / Referencia</label>
              <Input placeholder="Ej: Ticket Gasolinera Repsol A-42" value={currentGasto.descripcion} onChange={e => setCurrentGasto({ ...currentGasto, descripcion: e.target.value })} className="h-14 rounded-2xl border-slate-200 bg-white font-medium text-slate-900" />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-14 rounded-2xl border-2 font-bold transition-all shadow-sm ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                <Camera size={18} className="mr-2" /> {currentGasto.comprobanteFile ? 'TICKET OK' : 'FOTO TICKET'}
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setCurrentGasto({ ...currentGasto, comprobanteFile: e.target.files[0] })} accept="image/*" capture="environment" className="hidden" />
              </Button>
              <Button onClick={handleAddGasto} className="flex-[2] h-14 bg-emerald-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">AÑADIR GASTO</Button>
            </div>
          </div>

          <div className="space-y-3">
            {gastos.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 text-left">
                  <div className={`p-3 rounded-xl ${g.comprobanteBase64 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><FileText size={20} /></div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm uppercase leading-tight">{g.descripcion}</p>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">{g.rubro} • {g.monto.toFixed(2)}€ • {g.forma_pago}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></Button>
              </div>
            ))}
          </div>
        </section>

        {/* RESUMEN Y FIRMA */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paradas</p>
              <p className="text-3xl font-black text-emerald-400">{stops.length}</p>
            </div>
            <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Euros Total</p>
              <p className="text-3xl font-black text-emerald-400">{totalGastosSesion.toFixed(2)}€</p>
            </div>
          </div>

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

          <div className="pt-8">
            <Button
              onClick={handleSaveReport}
              disabled={loading}
              className="w-full h-24 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin text-emerald-400" size={28} /> : <Save size={28} className="text-emerald-400" />}
              {loading ? 'SINCRONIZANDO...' : 'FINALIZAR REPORTE DIARIO'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}