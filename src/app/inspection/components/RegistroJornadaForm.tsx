'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Save, Loader2, User, Euro, Trash2, Plus, 
  FileText, ClipboardSignature, Camera, Calendar as CalendarIcon, MapPin, CheckCircle2, AlertTriangle
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

// --- TIPOS DE DATOS ---
type GastoItem = {
  rubro: string;
  monto: number;
  descripcion:string;
  forma_pago: string;
  comprobanteUrl?: string;
  comprobanteFile?: File;
};

const initialGastoState = { rubro: 'Alimentación', monto: '', descripcion: '', forma_pago: 'Tarjeta Empresa', comprobanteFile: undefined };

export default function RegistroJornadaForm() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = firestore ? getStorage(firestore.app) : null;
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [observacionesDiarias, setObservacionesDiarias] = useState('');
  const [ubicacionPrincipal, setUbicacionPrincipal] = useState<{ lat: number, lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [clients, setClients] = useState<any[]>([]);

  // Estado para las horas
  const [horas, setHoras] = useState({
      normales: '',
      extrasTipo1: '', 
      extrasTipo2: '' 
  });

  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar Clientes para el selector de lugar
  useEffect(() => {
    const fetchClients = async () => {
        if (!firestore) return;
        try {
            const snap = await getDocs(collection(firestore, 'clientes'));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClients(list);
            await dbLocal.clientes_cache.bulkPut(list as any);
        } catch (e) {
            setClients(await dbLocal.clientes_cache.toArray());
        }
    };
    fetchClients();
  }, [firestore]);

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Error de Geolocalización' });
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUbicacionPrincipal({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLocationStatus('success');
      },
      () => {
        toast({ variant: 'destructive', title: 'Ubicación denegada' });
        setLocationStatus('error');
      }
    );
  };

  const handleHorasChange = (field: string, value: string) => {
      setHoras((prev: any) => ({...prev, [field]: value}));
  };

  const handleAddGasto = () => {
    if (!currentGasto.monto || !currentGasto.descripcion) {
      toast({ variant: 'destructive', title: 'Faltan datos' });
      return;
    }
    setGastos([...gastos, { ...currentGasto, monto: parseFloat(currentGasto.monto) }]);
    setCurrentGasto(initialGastoState);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setCurrentGasto((prev: any) => ({ ...prev, comprobanteFile: e.target.files![0] }));
    }
  };

  const totalGastos = useMemo(() => gastos.reduce((acc, curr) => acc + curr.monto, 0), [gastos]);

  const handleSaveParte = async () => {
    if (!user || !user.email) return;
    
    if (!horas.normales || !signature || !ubicacionPrincipal) {
        toast({ variant: 'destructive', title: 'Faltan datos críticos', description: 'Horas, Ubicación y Firma son obligatorios.' });
        return;
    }

    setLoading(true);
    
    const saveDataToLocal = async (synced: boolean, firebaseId?: string) => {
        const jornadaData = {
            reportDate, horas, observacionesDiarias, ubicacionPrincipal, lugarTrabajo,
            inspectorId: user.email, inspectorNombre: user.displayName || user.email,
        };

        const gastosData = gastos.map(g => ({
            ...g,
            fecha: reportDate,
            inspectorId: user.email,
            inspectorNombre: user.displayName || user.email,
            clienteNombre: lugarTrabajo || 'Varios/Oficina',
            estado: 'Pendiente de Aprobación',
        }));
        
        await dbLocal.registros_jornada.add({
            firebaseId: firebaseId || `J-${Date.now()}`,
            synced,
            data: { ...jornadaData, signature },
            createdAt: new Date(),
        });
        
        for (const gasto of gastosData) {
            await dbLocal.gastos.add({
                firebaseId: `G-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                synced: false,
                data: gasto,
                createdAt: new Date(),
            });
        }
        
        toast({ title: synced ? 'Jornada Registrada' : 'Guardado Local', description: 'Los datos están protegidos en el dispositivo.' });
    };

    if (isOnline && firestore && storage) {
        try {
          const jornadaId = `J-${Date.now().toString().slice(-6)}-${user.uid.slice(0,4)}`;
          const signatureRef = ref(storage, `firmas_jornadas/${jornadaId}.png`);
          await uploadString(signatureRef, signature!, 'data_url');
          const firmaUrl = await getDownloadURL(signatureRef);

            const gastosBatch = writeBatch(firestore);
            const gastosCollectionRef = collection(firestore, "gastos");
            for (const gasto of gastos) {
                const gastoRef = doc(gastosCollectionRef);
                let comprobanteUrl = '';
                if (gasto.comprobanteFile) {
                    const uniqueFileName = `${Date.now()}_${gasto.comprobanteFile.name}`;
                    const fileRef = ref(storage, `comprobantes_gastos/${jornadaId}/${uniqueFileName}`);
                    await uploadBytes(fileRef, gasto.comprobanteFile);
                    comprobanteUrl = await getDownloadURL(fileRef);
                }
                gastosBatch.set(gastoRef, {
                    fecha: reportDate, inspectorId: user.email, inspectorNombre: user.displayName || user.email,
                    clienteNombre: lugarTrabajo || 'Varios/Oficina', descripcion: gasto.descripcion, categoria: gasto.rubro,
                    monto: gasto.monto, estado: 'Pendiente de Aprobación', forma_pago: gasto.forma_pago,
                    comprobanteUrl
                });
            }
            await gastosBatch.commit();
            
            await setDoc(doc(firestore, "jornadas", jornadaId), {
                id: jornadaId, inspectorId: user.email, inspectorNombre: user.displayName || user.email,
                fecha: reportDate, ubicacionPrincipal, lugarTrabajo, horas,
                observaciones: observacionesDiarias, firmaUrl, fecha_creacion: serverTimestamp(),
            });

            await saveDataToLocal(true, jornadaId);
        } catch (e: any) {
            console.error("Cloud Save Failed:", e);
            await saveDataToLocal(false);
        }
    } else {
        await saveDataToLocal(false);
    }
    
    // Reset Form
    setHoras({ normales: '', extrasTipo1: '', extrasTipo2: '' });
    setObservacionesDiarias('');
    setGastos([]);
    setSignature(null);
    setUbicacionPrincipal(null);
    setLocationStatus('idle');
    setLugarTrabajo('');
    setLoading(false);
  };


  return (
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-slate-50">
      
      <main className="space-y-8 pb-40">
        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><CalendarIcon size={20} /></div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Registro de Jornada</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className='p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center gap-3 font-bold text-slate-700 shadow-sm'>
                  <User size={18} className="text-slate-400" /> Técnico: {user?.displayName || user?.email || 'Cargando...'}
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full h-auto p-4 rounded-2xl flex items-center justify-start gap-3 font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-primary hover:bg-slate-50 transition-all shadow-sm">
                      <CalendarIcon size={18} className="text-primary" /> {format(reportDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl">
                  <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus/>
                </PopoverContent>
              </Popover>
               <div className="md:col-span-2">
                <button 
                    onClick={handleCaptureLocation} 
                    disabled={locationStatus === 'loading'} 
                    className={`w-full bg-slate-50 border-2 rounded-xl p-3 flex items-center justify-center gap-3 font-bold shadow-sm text-sm transition-colors disabled:opacity-50 ${ubicacionPrincipal ? 'border-green-500 text-green-600' : 'border-slate-100 text-slate-700 hover:border-primary'}`}
                >
                    {locationStatus === 'loading' && <Loader2 className="animate-spin text-primary" size={16}/>}
                    {locationStatus !== 'loading' && (ubicacionPrincipal ? <CheckCircle2 size={16}/> : <MapPin size={16}/>)}
                    <span>{ubicacionPrincipal ? `COORDENADAS INICIALES: ${ubicacionPrincipal.lat.toFixed(4)}, ${ubicacionPrincipal.lon.toFixed(4)}` : 'REGISTRAR INICIO DE JORNADA'}</span>
                </button>
              </div>
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
           <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
              <Clock size={18} className="text-primary"/> Horas Trabajadas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="space-y-1 w-full text-left md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lugar / Cliente</label>
                  <Select value={lugarTrabajo} onValueChange={setLugarTrabajo}>
                    <SelectTrigger className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold h-12">
                        <SelectValue placeholder="SELECCIONAR LUGAR..." />
                    </SelectTrigger>
                    <SelectContent className='rounded-xl'>
                        <SelectItem value="Oficina Yepes" className='font-bold uppercase text-xs'>OFICINA CENTRAL</SelectItem>
                        {clients.map(c => <SelectItem key={c.id} value={c.nombre} className='font-bold uppercase text-xs'>{c.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
              </div>
              <div className="space-y-1 w-full text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horas Normales</label>
                  <Input type="number" min="0" step="0.5" value={horas.normales} onChange={e => handleHorasChange('normales', e.target.value)} placeholder="Ej: 8" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-primary font-bold text-slate-700 shadow-sm" />
              </div>
              <div className="space-y-1 w-full text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Horas Extra (T1)</label>
                  <Input type="number" min="0" step="0.5" value={horas.extrasTipo1} onChange={e => handleHorasChange('extrasTipo1', e.target.value)} placeholder="Ej: 2" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-bold text-slate-700 shadow-sm" />
              </div>
               <div className="space-y-1 w-full text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-rose-600">Extras Especiales</label>
                  <Input type="number" min="0" step="0.5" value={horas.extrasTipo2} onChange={e => handleHorasChange('extrasTipo2', e.target.value)} placeholder="Ej: Festivas" className="p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-bold text-slate-700 shadow-sm" />
              </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bitácora Diaria (Problemas, notas, avisos)</label>
              <textarea 
                  value={observacionesDiarias} 
                  onChange={e => setObservacionesDiarias(e.target.value)} 
                  placeholder="Redacte aquí un resumen de su actividad..." 
                  className="w-full mt-2 h-24 bg-slate-50 border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-primary focus:bg-white font-medium text-slate-600 resize-none shadow-sm"
              />
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-6 border border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
                  <Euro size={18} className="text-primary"/> Gastos y Dietas
              </h3>
              {gastos.length > 0 && 
                  <div className="font-black text-primary bg-primary/10 px-4 py-2 rounded-lg text-sm">
                      TOTAL ACUMULADO: {totalGastos.toFixed(2)} €
                  </div>
              }
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
              <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto (€)</label>
                  <Input value={currentGasto.monto} onChange={e => setCurrentGasto({...currentGasto, monto: e.target.value})} type="number" placeholder="0.00" className="p-4 rounded-xl border-slate-200 focus:border-primary font-bold bg-white shadow-sm h-12" />
              </div>
              
              <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Gasto</label>
                  <Select value={currentGasto.rubro} onValueChange={value => setCurrentGasto({...currentGasto, rubro: value})}>
                  <SelectTrigger className="p-4 rounded-xl border-slate-200 focus:border-primary font-bold bg-white shadow-sm h-12"><SelectValue/></SelectTrigger>
                  <SelectContent className="rounded-xl">
                      {['Alimentación', 'Combustible', 'Peajes', 'Hospedaje', 'Repuestos', 'Otros'].map(r => <SelectItem key={r} value={r} className="font-medium">{r}</SelectItem>)}
                  </SelectContent>
                  </Select>
              </div>

              <div className="space-y-1 md:col-span-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto / Referencia</label>
                  <Input value={currentGasto.descripcion} onChange={e => setCurrentGasto({...currentGasto, descripcion: e.target.value})} type="text" placeholder="Ej: Ticket Peaje AP-36" className="p-4 rounded-xl border-slate-200 focus:border-primary font-medium bg-white shadow-sm h-12" />
              </div>
              
              <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Método de Pago</label>
                  <Select value={currentGasto.forma_pago} onValueChange={value => setCurrentGasto({...currentGasto, forma_pago: value})}>
                      <SelectTrigger className="p-4 rounded-xl border-slate-200 focus:border-primary font-bold bg-white shadow-sm h-12"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                          <SelectItem value="Tarjeta Empresa">Tarjeta Empresa</SelectItem>
                          <SelectItem value="Efectivo (Bolsillo)">Efectivo (Reembolsable)</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              
              <div className="space-y-1 flex flex-col justify-end">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`p-4 h-12 rounded-xl font-bold flex items-center justify-center gap-2 border-2 transition-all shadow-sm ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-600 hover:border-primary/50 bg-white'}`}>
                      <Camera size={18}/> {currentGasto.comprobanteFile ? 'ADJUNTO OK' : 'SUBIR TICKET'}
                  </Button>
              </div>
              
              <Button onClick={handleAddGasto} className="p-4 h-12 rounded-xl bg-primary/90 text-white font-black flex items-center justify-center gap-2 md:col-span-2 hover:bg-primary shadow-md active:scale-95 transition-all">
                  <Plus size={18}/> AÑADIR AL RESUMEN
              </Button>
          </div>
          
          <div className="space-y-3 pt-2">
              {gastos.map((g, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border-2 border-slate-100 p-4 rounded-2xl shadow-sm gap-4">
                      <div className="flex items-start sm:items-center gap-4 text-left">
                          <div className={`p-3 rounded-full ${g.comprobanteUrl || g.comprobanteFile ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {g.comprobanteUrl || g.comprobanteFile ? <FileText size={20}/> : <AlertTriangle size={20}/>}
                          </div>
                          <div>
                              <p className="font-bold text-base text-slate-800">{g.descripcion}</p>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{g.rubro} • {g.forma_pago}</p>
                          </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                          <span className="font-black text-lg text-slate-900">{g.monto.toFixed(2)} €</span>
                          <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => i !== idx))} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full h-10 w-10 transition-colors"><Trash2 size={20}/></Button>
                      </div>
                  </div>
              ))}
              {gastos.length === 0 && <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-8">No hay gastos en esta jornada</p>}
          </div>
        </section>

        <section className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter"><ClipboardSignature size={18} className="text-primary"/> Firma de Veracidad</h3>
          <p className="text-xs text-slate-500 font-medium text-left">Certifico que los datos aquí expuestos corresponden fielmente a mi actividad laboral del día.</p>
          <div className="pt-2">
              <SignaturePad title="Firma del Técnico" signature={signature} onSignatureEnd={setSignature} />
          </div>
        </section>

        <div className="flex flex-col md:flex-row gap-4">
          <Button onClick={handleSaveParte} disabled={loading} className="w-full p-8 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800">
            {loading ? <Loader2 className="animate-spin text-primary" /> : <Save className="text-primary" />}
            {loading ? 'ENVIANDO...' : 'CERRAR JORNADA Y GUARDAR'}
          </Button>
        </div>
      </main>
    </div>
  );
}
