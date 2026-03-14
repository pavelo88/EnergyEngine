'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  Save, Loader2, User, Euro, Trash2, Plus, 
  FileText, ClipboardSignature, Upload, Camera, Calendar as CalendarIcon, FileSearch, Building, Clock, AlertTriangle, MapPin, CheckCircle2, Zap
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { addDoc, collection, serverTimestamp, updateDoc, doc, writeBatch, setDoc } from 'firebase/firestore';
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
import SignaturePad from '../SignaturePad';
import StableInput from '../StableInput';

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

// --- COMPONENTE PRINCIPAL ---
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

  // Estado para las horas
  const [horas, setHoras] = useState({
      normales: '',
      extrasTipo1: '', // Ej: Horas extra normales
      extrasTipo2: ''  // Ej: Horas extra especiales
  });

  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setUbicacionPrincipal({ lat: latitude, lon: longitude });
        setLocationStatus('success');
      },
      () => {
        toast({ variant: 'destructive', title: 'Ubicación denegada', description: 'Asegúrate de tener los permisos de localización activados.' });
        setLocationStatus('error');
      }
    );
  };

  // --- LÓGICA DEL FORMULARIO ---
  const handleHorasChange = (field: string, value: string) => {
      setHoras((prev: any) => ({...prev, [field]: value}));
  };

  const handleAddGasto = () => {
    if (!currentGasto.monto || !currentGasto.descripcion) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'El monto y la descripción del gasto son obligatorios.' });
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
    if (!user || !firestore || !storage || !user.email) {
        toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Servicios no disponibles. Por favor, recarga.' });
        return;
    }
    if (!horas.normales) {
        toast({ variant: 'destructive', title: 'Faltan Horas', description: 'Introduce al menos las horas normales trabajadas.' });
        return;
    }
    if (!signature) {
        toast({ variant: 'destructive', title: 'Falta Firma', description: 'La firma del técnico es obligatoria.' });
        return;
    }
    if (!ubicacionPrincipal) {
        toast({ variant: 'destructive', title: 'Falta Ubicación', description: 'La ubicación principal es obligatoria para iniciar.' });
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
            firebaseId: firebaseId || '',
            synced,
            data: { ...jornadaData, signature },
            createdAt: new Date(),
        });
        
        for (const gasto of gastosData) {
            await dbLocal.gastos.add({
                firebaseId: '',
                synced: false,
                data: gasto,
                createdAt: new Date(),
            });
        }
        
        if (!synced) {
            toast({ title: 'Guardado localmente (sin conexión)', description: 'La jornada y los gastos se sincronizarán más tarde.' });
        } else {
            toast({ title: '¡Jornada Registrada!', description: `Jornada y ${gastos.length} gastos sincronizados. ID: ${firebaseId}` });
        }
    };

    if (isOnline) {
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
                    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${gasto.comprobanteFile.name}`;
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
            
            const jornadaDocRef = doc(collection(firestore, "jornadas"), jornadaId);
            await setDoc(jornadaDocRef, {
                id: jornadaDocRef.id, inspectorId: user.email, inspectorNombre: user.displayName || user.email,
                fecha: reportDate, ubicacionPrincipal, lugarTrabajo, horas,
                observaciones: observacionesDiarias, firmaUrl, fecha_creacion: serverTimestamp(),
            });

            await saveDataToLocal(true, jornadaId);
            
        } catch (e: any) {
            console.error("Error guardando en Firebase, guardando localmente...", e);
            await saveDataToLocal(false);
        }
    } else {
        await saveDataToLocal(false);
    }
    
    setReportDate(new Date());
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
    <div className="space-y-6 pb-24 md:pb-10 animate-in fade-in slide-in-from-right-4 duration-500 min-h-screen bg-white">
      
      <main className="space-y-8 pb-40">
        {/* SECCIÓN 1: CABECERA Y FECHA */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><CalendarIcon size={20} /></div>
            <h2 className="text-xl font-black text-black uppercase tracking-tighter">Registro de Jornada</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div className='p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 font-bold text-slate-700 shadow-sm text-sm'>
                  <User size={16} className="text-primary" /> <span className="text-[10px] font-black uppercase text-slate-500">Técnico:</span> {user?.displayName || user?.email || 'Cargando...'}
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-full h-auto p-3.5 rounded-2xl flex items-center justify-start gap-3 font-bold text-slate-700 bg-slate-50 border border-slate-100 hover:border-primary transition-all shadow-sm text-xs">
                      <CalendarIcon size={16} className="text-primary" /> {format(reportDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }).toUpperCase()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 bg-white">
                  <Calendar mode="single" selected={reportDate} onSelect={(date) => date && setReportDate(date)} initialFocus/>
                </PopoverContent>
              </Popover>
               <div className="md:col-span-2">
                <button 
                    onClick={handleCaptureLocation} 
                    disabled={locationStatus === 'loading'} 
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-center gap-2 font-black shadow-sm text-xs transition-all active:scale-95 disabled:opacity-50 ${ubicacionPrincipal ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-100 text-slate-400 hover:border-primary'}`}
                >
                    {locationStatus === 'loading' ? <Loader2 className="animate-spin text-primary" size={14}/> : ubicacionPrincipal ? <CheckCircle2 size={14} className="text-emerald-500"/> : <MapPin size={14}/>}
                    <span>{ubicacionPrincipal ? `JORNADA INICIADA EN GPS` : 'INICIAR JORNADA (UBICACIÓN)'}</span>
                </button>
              </div>
          </div>
        </section>

        {/* SECCIÓN 2: REGISTRO DE HORAS */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
           <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
              <Clock size={14} className="text-primary"/> Horas Trabajadas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
               <div className="md:col-span-1">
                  <StableInput label="Lugar de Trabajo" icon={Building} value={lugarTrabajo} onChange={(v: string) => setLugarTrabajo(v)} placeholder="Ej: Oficina / Cliente X" />
              </div>
              <StableInput label="Horas Normales" icon={Clock} type="number" min="0" step="0.5" value={horas.normales} onChange={(v: string) => handleHorasChange('normales', v)} placeholder="Ej: 8" />
              <StableInput label="Horas Extra (T1)" icon={Zap} type="number" min="0" step="0.5" value={horas.extrasTipo1} onChange={(v: string) => handleHorasChange('extrasTipo1', v)} placeholder="Ej: 2" />
              <StableInput label="Horas Extra (T2)" icon={Zap} type="number" min="0" step="0.5" value={horas.extrasTipo2} onChange={(v: string) => handleHorasChange('extrasTipo2', v)} placeholder="Ej: Festivas" />
          </div>

          <div className="pt-4 border-t border-slate-100">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Observaciones del día</label>
              <textarea 
                  value={observacionesDiarias} 
                  onChange={e => setObservacionesDiarias(e.target.value)} 
                  placeholder="Añade comentarios sobre tu jornada aquí..." 
                  className="w-full mt-2 h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-primary focus:bg-white font-medium text-black resize-none shadow-sm text-sm"
              />
          </div>
        </section>

        {/* SECCIÓN 3: GASTOS ASOCIADOS */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Euro size={14} className="text-primary"/> Gastos y Comprobantes
              </h3>
              {gastos.length > 0 && 
                  <div className="font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg text-[10px] uppercase tracking-tighter">
                      TOTAL: {totalGastos.toFixed(2)} €
                  </div>
              }
          </div>
          
          {/* Formulario de Gasto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <StableInput label="Monto (€)" icon={Euro} value={currentGasto.monto} onChange={(v: string) => setCurrentGasto({...currentGasto, monto: v})} type="number" placeholder="0.00" />
              
              <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Gasto</label>
                  <Select value={currentGasto.rubro} onValueChange={value => setCurrentGasto({...currentGasto, rubro: value})}>
                  <SelectTrigger className="p-2.5 rounded-xl border-slate-200 focus:border-primary font-bold bg-white shadow-sm h-10 text-xs text-black"><SelectValue/></SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 bg-white">
                      {['Alimentación', 'Combustible', 'Peajes', 'Hospedaje', 'Repuestos', 'Otros'].map(r => <SelectItem key={r} value={r} className="font-medium">{r}</SelectItem>)}
                  </SelectContent>
                  </Select>
              </div>

              <div className="md:col-span-2">
                  <StableInput label="Concepto / Descripción" icon={FileText} value={currentGasto.descripcion} onChange={(v: string) => setCurrentGasto({...currentGasto, descripcion: v})} type="text" placeholder="Ej: Comida en Restaurante El Paso" />
                     <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Forma de Pago</label>
                  <Select value={currentGasto.forma_pago} onValueChange={value => setCurrentGasto({...currentGasto, forma_pago: value})}>
                      <SelectTrigger className="p-2.5 rounded-xl border-slate-200 focus:border-primary font-bold bg-white shadow-sm h-10 text-xs text-black"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 bg-white">
                          <SelectItem value="Tarjeta Empresa">Tarjeta Empresa</SelectItem>
                          <SelectItem value="Efectivo (Bolsillo)">Efectivo (Bolsillo propio)</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
              </div>
              
              <div className="space-y-1 flex flex-col justify-end">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`p-2.5 h-10 rounded-xl font-black flex items-center justify-center gap-2 border transition-all shadow-sm text-[10px] uppercase tracking-widest ${currentGasto.comprobanteFile ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 'border-slate-200 text-slate-400 hover:border-primary/50 bg-white'}`}>
                      <Camera size={14}/> {currentGasto.comprobanteFile ? 'TICKET ADJUNTO' : 'SUBIR TICKET'}
                  </Button>
              </div>
              
               <Button onClick={handleAddGasto} className="p-4 h-auto rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 md:col-span-2 hover:bg-slate-800 shadow-md active:scale-95 transition-all text-xs uppercase tracking-widest">
                  <Plus size={16}/> AÑADIR GASTO A LA JORNADA
              </Button>
          </div>
          
          {/* Lista de Gastos Agregados */}
          <div className="space-y-3 pt-2">
              {gastos.map((g, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm gap-4 transition-all hover:border-primary/30">
                      <div className="flex items-start sm:items-center gap-4">
                          <div className={`p-3 rounded-xl ${g.comprobanteUrl || g.comprobanteFile ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {g.comprobanteUrl || g.comprobanteFile ? <FileText size={18}/> : <AlertTriangle size={18}/>}
                          </div>
                          <div>
                              <p className="font-bold text-sm text-black">{g.descripcion}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{g.rubro} • {g.forma_pago}</p>
                              {!(g.comprobanteUrl || g.comprobanteFile) && <p className="text-[9px] font-black text-rose-500 mt-0.5 uppercase tracking-tighter">Falta ticket comprobante</p>}
                          </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                          <span className="font-black text-base text-black">{g.monto.toFixed(2)} €</span>
                          <Button variant="ghost" size="icon" onClick={() => setGastos(gastos.filter((_, idx) => i !== idx))} className="text-rose-500 hover:bg-rose-500/10 rounded-xl h-9 w-9 transition-colors"><Trash2 size={16}/></Button>
                      </div>
                  </div>
              ))}
              {gastos.length === 0 && <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-8">Ningún gasto registrado hoy</p>}
          </div>
        </section>

        {/* SECCIÓN 4: FIRMA DEL TÉCNICO */}
        <section className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm space-y-4 border border-slate-100">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2"><ClipboardSignature size={14} className="text-primary"/> Validación del Técnico</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Declaro que las horas y gastos indicados son correctos.</p>
          
          <div className="pt-2">
              <SignaturePad title="Firma del Técnico" signature={signature} onSignatureEnd={setSignature} />
              <p className="text-center font-black mt-2 text-slate-400 text-[8px] uppercase">{user?.displayName || user?.email}</p>
          </div>
        </section>

        {/* SECCIÓN 5: ACCIONES */}
        <div className="pt-4">
          <Button onClick={handleSaveParte} disabled={loading} className="w-full p-8 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50 hover:bg-slate-800">
            {loading ? <Loader2 className="animate-spin text-white" size={20} /> : <Save className="text-white" size={20} />}
            {loading ? 'ENVIANDO REGISTRO...' : 'GUARDAR JORNADA Y GASTOS'}
          </Button>
        </div>
      </main>
    </div>
  );
}
