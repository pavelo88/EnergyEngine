'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Save, Loader2, User, Euro, Trash2, Plus,
  FileText, ClipboardSignature, Camera, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertTriangle,
  Clock, Navigation, Building2, MapPinned
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { collection, serverTimestamp, doc, writeBatch, setDoc, getDocs } from 'firebase/firestore';
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
import PinGate from './security/PinGate';

// --- TIPOS DE DATOS ---
type GastoItem = {
  rubro: string;
  monto: number;
  descripcion: string;
  forma_pago: string;
  stopId: string; // ID de la parada o 'general'
  comprobanteUrl?: string;
  comprobanteFile?: File;
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
  const { toast } = useToast();

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [observacionesDiarias, setObservacionesDiarias] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  
  // Itinerario y Clientes
  const [stops, setStops] = useState<Stop[]>([]);
  const [currentStop, setCurrentStop] = useState<any>(initialStopState);
  const [clients, setClients] = useState<any[]>([]);

  // Gastos
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);

  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar Clientes
  useEffect(() => {
    const fetchClients = async () => {
      if (!firestore) return;
      try {
        const snap = await getDocs(collection(firestore, 'clientes'));
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setClients(list.sort((a,b) => (a.nombre > b.nombre ? 1 : -1)));
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
    
    // Capturar ubicación en el momento de añadir la parada
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newStop: Stop = {
          ...currentStop,
          id: `stop-${Date.now()}`,
          ubicacion: { lat: pos.coords.latitude, lon: pos.coords.longitude }
        };
        setStops([...stops, newStop]);
        setCurrentStop(initialStopState);
        toast({ title: 'PARADA REGISTRADA', description: `Ubicación capturada para ${currentStop.clienteNombre}` });
      }, () => {
        const newStop: Stop = { ...currentStop, id: `stop-${Date.now()}`, ubicacion: null };
        setStops([...stops, newStop]);
        setCurrentStop(initialStopState);
        toast({ title: 'PARADA SIN GPS', description: 'No se pudo obtener la ubicación.' });
      });
    }
  };

  const handleAddGasto = () => {
    if (!currentGasto.monto || !currentGasto.descripcion) {
      toast({ variant: 'destructive', title: 'Faltan datos en el gasto' });
      return;
    }
    setGastos([...gastos, { ...currentGasto, monto: parseFloat(currentGasto.monto) }]);
    setCurrentGasto(initialGastoState);
  };

  const totalGastos = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);

  const handleSaveReport = async () => {
    if (!user || !user.email) return;
    if (!signature) {
      toast({ variant: 'destructive', title: 'Firma requerida', description: 'Debes firmar para validar el registro.' });
      return;
    }

    setLoading(true);

    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
      const dataToSave = {
        reportDate, stops, gastos, observacionesDiarias,
        inspectorId: user.email, inspectorNombre: user.displayName || user.email,
        signature
      };

      await dbLocal.table('gastos_report' as any).add({
        firebaseId: firebaseId || `GR-${Date.now()}`,
        synced,
        data: dataToSave,
        createdAt: new Date(),
      });

      toast({ title: synced ? 'REGISTRO ENVIADO' : 'GUARDADO LOCAL', description: 'Los datos están protegidos y listos.' });
    };

    if (isOnline && firestore && storage) {
      try {
        const reportId = `GR-${Date.now()}-${user.uid.slice(0, 4)}`;
        
        // Subir Firma
        const signatureRef = ref(storage, `firmas_gastos/${reportId}.png`);
        await uploadString(signatureRef, signature!, 'data_url');
        const firmaUrl = await getDownloadURL(signatureRef);

        const batch = writeBatch(firestore);
        
        // Procesar Gastos con sus comprobantes
        const formattedGastos = [];
        for (const g of gastos) {
          let cUrl = '';
          if (g.comprobanteFile) {
            const fRef = ref(storage, `comprobantes_gastos/${reportId}/${Date.now()}_${g.comprobanteFile.name}`);
            await uploadBytes(fRef, g.comprobanteFile);
            cUrl = await getDownloadURL(fRef);
          }
          
          const stopInfo = stops.find(s => s.id === g.stopId);
          formattedGastos.push({
            ...g,
            comprobanteUrl: cUrl,
            clienteNombre: stopInfo?.clienteNombre || 'Gasto General',
            fecha: reportDate
          });
        }

        await setDoc(doc(firestore, "hojas_gastos", reportId), {
          id: reportId,
          inspectorId: user.email,
          inspectorNombre: user.displayName || user.email,
          fecha: reportDate,
          itinerario: stops,
          gastos: formattedGastos.map(({comprobanteFile, ...rest}) => rest),
          observaciones: observacionesDiarias,
          firmaUrl,
          total: totalGastos,
          fecha_creacion: serverTimestamp(),
        });

        await saveDataToLocal(true, reportId);
      } catch (e: any) {
        console.error("Cloud Save Failed:", e);
        await saveDataToLocal(false);
      }
    } else {
      await saveDataToLocal(false);
    }

    setLoading(false);
    // Reset Form (opcional o redirigir)
    window.location.reload(); 
  };

  if (!isVerified && user) return <PinGate userEmail={user.email!} onVerified={() => setIsVerified(true)} />;

  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-slate-50 p-4">
      
      <main className="max-w-4xl mx-auto space-y-8 pb-40">
        
        {/* CABECERA */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center"><Euro size={24} /></div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Registro de Gastos</h2>
                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mt-1">Energy Engine Management System</p>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="h-12 px-6 rounded-2xl flex items-center gap-3 font-bold text-slate-700 bg-slate-50 border-2 border-slate-100 hover:border-primary transition-all shadow-sm">
                  <CalendarIcon size={18} className="text-primary" /> {format(reportDate, "d MMM yyyy", { locale: es }).toUpperCase()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl">
                <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* ITINERARIO DEL DÍA */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MapPinned size={20} className="text-primary" />
            <h3 className="font-black text-slate-900 uppercase text-sm tracking-tighter">Itinerario y Paradas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Punto de Intervención</label>
              <Select 
                value={currentStop.clienteId} 
                onValueChange={(val) => {
                  const c = clients.find(cl => cl.id === val);
                  setCurrentStop({...currentStop, clienteId: val, clienteNombre: c?.nombre || ''});
                }}
              >
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900">
                  <SelectValue placeholder="SELECCIONAR CLIENTE..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-xl">
                  <SelectItem value="OFICINA" className="font-bold">OFICINA CENTRAL</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id} className="font-medium uppercase">{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Actividad</label>
              <Select value={currentStop.actividad} onValueChange={(v) => setCurrentStop({...currentStop, actividad: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl font-bold">
                  {['Inspección', 'Avería', 'Mantenimiento', 'Entrega', 'Obra', 'Otros'].map(a => <SelectItem key={a} value={a}>{a.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddStop} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black md:col-span-3 hover:bg-slate-800 active:scale-95 transition-all">
              <Navigation size={18} className="mr-2 text-primary" /> REGISTRAR PARADA AHORA (BORRAR GPS)
            </Button>
          </div>

          <div className="space-y-3">
            {stops.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-black">{i + 1}</div>
                   <div>
                      <p className="font-bold text-slate-800 uppercase">{s.clienteNombre}</p>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest">{s.actividad} • {s.hora} • {s.ubicacion ? 'GPS OK' : 'SIN GPS'}</p>
                   </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setStops(stops.filter(st => st.id !== s.id))} className="text-red-400 hover:text-red-600 rounded-full">
                  <Trash2 size={20} />
                </Button>
              </div>
            ))}
            {stops.length === 0 && <div className="py-10 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-300 font-bold uppercase text-xs">No hay paradas registradas hoy</div>}
          </div>
        </section>

        {/* GASTOS */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
           <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
              < Euro size={18} className="text-primary" /> Gastos del Día
            </h3>
            {totalGastos > 0 && <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-black text-sm">TOTAL: {totalGastos.toFixed(2)} €</div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl border-2 border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
              <Select value={currentGasto.rubro} onValueChange={v => setCurrentGasto({...currentGasto, rubro: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {['Combustible', 'Peajes', 'Parking', 'Manutención', 'Hospedaje', 'Otros'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto (€)</label>
              <Input type="number" placeholder="0.00" value={currentGasto.monto} onChange={e => setCurrentGasto({...currentGasto, monto: e.target.value})} className="h-14 rounded-2xl border-slate-200 bg-white font-black text-xl text-slate-900" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Forma de Pago</label>
              <Select value={currentGasto.forma_pago} onValueChange={v => setCurrentGasto({...currentGasto, forma_pago: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {['Tarjeta Empresa', 'Efectivo', 'Transferencia', 'Tarjeta Personal'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asociado a Parada</label>
              <Select value={currentGasto.stopId} onValueChange={v => setCurrentGasto({...currentGasto, stopId: v})}>
                <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white font-bold text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="general" className="font-bold">GASTO GENERAL / OTROS</SelectItem>
                  {stops.map((s, i) => <SelectItem key={s.id} value={s.id}>PARADA {i+1}: {s.clienteNombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto / Referencia</label>
              <Input placeholder="Ej: Ticket Gasolinera Repsol" value={currentGasto.descripcion} onChange={e => setCurrentGasto({...currentGasto, descripcion: e.target.value})} className="h-14 rounded-2xl border-slate-200 bg-white font-medium text-slate-900" />
            </div>
            <div className="flex gap-2 md:col-span-2">
               <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-14 rounded-2xl border-2 font-bold transition-all shadow-sm ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 bg-white'}`}>
                  <Camera size={18} className="mr-2" /> {currentGasto.comprobanteFile ? 'TICKET OK' : 'SUBIR TICKET'}
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && setCurrentGasto({...currentGasto, comprobanteFile: e.target.files[0]})} accept="image/*" className="hidden" />
               </Button>
               <Button onClick={handleAddGasto} className="flex-[2] h-14 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                  AÑADIR GASTO
               </Button>
            </div>
          </div>

          <div className="space-y-3">
             {gastos.map((g, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                   <div className="flex items-center gap-4 text-left">
                      <div className={`p-3 rounded-xl ${g.comprobanteFile ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-400'}`}>
                         <FileText size={20} />
                      </div>
                      <div>
                         <p className="font-bold text-slate-800 text-sm">{g.descripcion}</p>
                         <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                            {g.rubro} • {g.monto.toFixed(2)}€ • {stops.find(s => s.id === g.stopId)?.clienteNombre || 'GENERAL'}
                         </p>
                      </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                   </Button>
                </div>
             ))}
          </div>
        </section>

        {/* FIRMA Y ENVÍO */}
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100 text-center">
          <div className="flex flex-col items-center gap-2">
            <ClipboardSignature size={32} className="text-primary" />
            <h3 className="font-black text-slate-900 uppercase tracking-tighter">Validación Final</h3>
            <p className="text-xs text-slate-400 font-medium max-w-xs">Certifico que los itinerarios y gastos declarados son veraces y corresponden a mi jornada.</p>
          </div>
          <SignaturePad title="Firma del Inspector" signature={signature} onSignatureEnd={setSignature} />
          
          <div className="pt-6">
            <Button 
              onClick={handleSaveReport} 
              disabled={loading} 
              className="w-full h-24 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin text-primary" size={28} /> : <Save size={28} className="text-primary" />}
              {loading ? 'SINCRONIZANDO...' : 'FINALIZAR REGISTRO DE GASTOS'}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
