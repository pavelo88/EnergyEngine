'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Save, Loader2, Euro, Trash2, Plus, FileText, Camera, Calendar as CalendarIcon, Check, Pencil
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { OT_STATUS } from '@/lib/constants';
import { fileToBase64 } from '@/lib/offline-utils';
import { resolveInspectorEmail } from '@/lib/inspection-mode';

// --- TIPOS DE DATOS ---
type GastoItem = {
  id: string; rubro: string; monto: number; descripcion: string; forma_pago: string; hora: string;
  comprobanteUrl?: string; fecha: string | Date; estado: 'Registrado' | 'Aprobado';
  clienteId?: string; clienteNombre?: string; orderId?: string;
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

const initialGastoState = { rubro: 'Combustible', monto: '', descripcion: '', forma_pago: 'Tarjeta Empresa', hora: format(new Date(), 'HH:mm'), comprobanteFile: undefined, clienteId: '', clienteNombre: '', orderId: '' };

export default function RegistroGastoForm({ otFilter }: { otFilter?: string | null }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = firestore ? getStorage(firestore.app) : null;
  const isOnline = useOnlineStatus();
  const inspectorEmail = resolveInspectorEmail(user?.email || '');
  const canUseCloud = isOnline && !!firestore && !!storage && !!user?.email;
  const { toast } = useToast();

  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [gastos, setGastos] = useState<GastoItem[]>([]);
  const [currentGasto, setCurrentGasto] = useState<any>(initialGastoState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [activeOTs, setActiveOTs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!canUseCloud || !inspectorEmail) { setInitialLoading(false); return; }
      setInitialLoading(true);
      try {
        const [gastosSnap, clientsSnap, otsSnap] = await Promise.all([
          getDocs(query(collection(firestore, "gastos_detalle"), where("inspectorId", "==", inspectorEmail), where("fechaStr", "==", format(reportDate, 'yyyy-MM-dd')))),
          getDocs(collection(firestore, 'clientes')),
          getDocs(query(collection(firestore, 'ordenes_trabajo'), where('inspectorIds', 'array-contains', inspectorEmail), where('estado', 'in', [OT_STATUS.EN_PROCESO, OT_STATUS.REGISTRADA])))
        ]);

        setGastos(gastosSnap.docs.map(d => ({ id: d.id, ...d.data() } as GastoItem)));
        setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string, nombre: string })).sort((a, b) => a.nombre > b.nombre ? 1 : -1));
        
        const ots = otsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActiveOTs(ots);

        // Si hay filtro de OT, pre-seleccionamos en el formulario de gasto
        if (otFilter) {
          const targetOT: any = ots.find(o => o.id === otFilter);
          if (targetOT) {
            setCurrentGasto((prev: any) => ({
              ...prev,
              clienteId: targetOT.clienteId || '',
              clienteNombre: targetOT.clienteNombre || targetOT.cliente || '',
              orderId: targetOT.id
            }));
          }
        }

      } catch (e) { console.error(e); }
      setInitialLoading(false);
    };
    load();
  }, [reportDate, inspectorEmail, canUseCloud, firestore, otFilter]);

  const handleAddGasto = async () => {
    if (!currentGasto.monto) {
      return toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor, introduce el monto del gasto.' });
    }
    if (!currentGasto.descripcion) {
      return toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor, introduce una descripción o concepto.' });
    }
    if (!currentGasto.hora) {
      return toast({ variant: 'destructive', title: 'Faltan datos', description: 'Por favor, selecciona la hora del gasto.' });
    }
    const confirmMsg = `¿Registrar gasto de ${currentGasto.monto}€ en ${currentGasto.rubro}?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      let cUrl = '';
      if (currentGasto.comprobanteFile && canUseCloud) {
        const base64 = await fileToBase64(currentGasto.comprobanteFile);
        const fRef = ref(storage!, `comprobantes/${inspectorEmail}/${Date.now()}_img.png`);
        await uploadString(fRef, base64, 'data_url');
        cUrl = await getDownloadURL(fRef);
      }

      const id = `GASTO-${(inspectorEmail || 'tecnico').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`;
      const docData: GastoItem = {
        id, rubro: currentGasto.rubro, monto: parseFloat(currentGasto.monto),
        descripcion: currentGasto.descripcion, forma_pago: currentGasto.forma_pago,
        hora: currentGasto.hora, comprobanteUrl: cUrl || undefined,
        fecha: reportDate, estado: 'Registrado',
        clienteId: currentGasto.clienteId || null,
        clienteNombre: currentGasto.clienteNombre || null,
        orderId: currentGasto.orderId || null
      };

      await setDoc(doc(firestore!, "gastos_detalle", id), cleanData({
        ...docData,
        inspectorId: inspectorEmail,
        inspectorNombre: user?.displayName || inspectorEmail,
        fechaStr: format(reportDate, 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      }));

      // Actualizar estado de la OT a 'En Proceso'
      if (currentGasto.orderId) {
        await updateDoc(doc(firestore!, 'ordenes_trabajo', currentGasto.orderId), { estado: OT_STATUS.EN_PROCESO });
      }

      setGastos([...gastos, docData]);
      setCurrentGasto(initialGastoState);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({ title: 'GASTO REGISTRADO ✅' });
    } catch (e) { toast({ variant: 'destructive', title: 'Error al registrar' }); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const g = gastos.find(x => x.id === id);
    if (!g || g.estado === 'Aprobado') return toast({ variant: 'destructive', title: 'Bloqueado', description: 'Gasto ya aprobado por administración.' });
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await deleteDoc(doc(firestore!, "gastos_detalle", id));
      setGastos(gastos.filter(x => x.id !== id));
      toast({ title: 'Gasto eliminado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
  };

  const totalDia = useMemo(() => gastos.reduce((s, g) => s + g.monto, 0), [gastos]);

  if (initialLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 text-left pb-20">
      <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center shadow-lg"><Euro size={24} /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">Registro de Gastos</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Total: {totalDia.toFixed(2)}€</p>
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 rounded-2xl font-bold border-2 text-slate-700 bg-white"><CalendarIcon size={18} className="mr-2" />{format(reportDate, "d MMM yyyy", { locale: es }).toUpperCase()}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-[150] bg-white border shadow-2xl">
            <Calendar mode="single" selected={reportDate} onSelect={(d) => d && setReportDate(d)} disabled={(d) => isAfter(d, new Date()) || isBefore(d, subDays(new Date(), 60))} initialFocus />
          </PopoverContent>
        </Popover>
      </section>

      <section className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-100 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Hora</label>
            <Input type="time" value={currentGasto.hora} onChange={e => setCurrentGasto({ ...currentGasto, hora: e.target.value })} className="h-14 rounded-2xl bg-slate-50 border-transparent font-black" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Monto (€)</label>
            <Input type="number" placeholder="0.00" value={currentGasto.monto} onChange={e => setCurrentGasto({ ...currentGasto, monto: e.target.value })} className="h-14 rounded-2xl bg-slate-50 border-transparent font-black text-emerald-600 text-xl" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Rubro</label>
            <Select value={currentGasto.rubro} onValueChange={v => setCurrentGasto({ ...currentGasto, rubro: v })}>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[150] bg-white">{['Combustible', 'Peajes', 'Parking', 'Manutención', 'Obras', 'Otros'].map(r => <SelectItem key={r} value={r}>{r.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pago</label>
            <Select value={currentGasto.forma_pago} onValueChange={v => setCurrentGasto({ ...currentGasto, forma_pago: v })}>
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[150] bg-white">{['Tarjeta Empresa', 'Efectivo', 'Personal'].map(f => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Vincular a OT (Opcional)</label>
            <Select
              value={currentGasto.orderId}
              onValueChange={(val) => {
                const ot = activeOTs.find(o => o.id === val);
                if (ot) {
                  setCurrentGasto({
                    ...currentGasto,
                    orderId: ot.id,
                    clienteId: ot.clienteId || '',
                    clienteNombre: ot.clienteNombre || ot.cliente || ''
                  });
                } else {
                  setCurrentGasto({ ...currentGasto, orderId: '', clienteId: '', clienteNombre: '' });
                }
              }}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold">
                <SelectValue placeholder="NINGUNA (GASTO GENERAL)" />
              </SelectTrigger>
              <SelectContent className="z-[150] bg-white">
                <SelectItem value="none">NINGUNA (GASTO GENERAL)</SelectItem>
                {activeOTs.map(ot => (
                  <SelectItem key={ot.id} value={ot.id}>{ot.id} - {ot.descripcion?.substring(0, 30)}...</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cliente</label>
            <Select
              value={currentGasto.clienteId}
              disabled={!!currentGasto.orderId}
              onValueChange={(val) => setCurrentGasto({ ...currentGasto, clienteId: val, clienteNombre: clients.find(c => c.id === val)?.nombre })}
            >
              <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold">
                <SelectValue placeholder="SELECCIONAR CLIENTE..." />
              </SelectTrigger>
              <SelectContent className="z-[150] bg-white">
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Descripción / Concepto</label>
            <Input placeholder="Escriba el concepto del ticket..." value={currentGasto.descripcion} onChange={e => setCurrentGasto({ ...currentGasto, descripcion: e.target.value })} className="h-14 rounded-2xl bg-slate-50 border-transparent font-bold" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className={`flex-1 h-14 rounded-2xl border-2 font-bold ${currentGasto.comprobanteFile ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200'}`}><Camera size={18} className="mr-2" />{currentGasto.comprobanteFile ? 'FOTO OK' : 'FOTO TICKET'}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={e => setCurrentGasto({ ...currentGasto, comprobanteFile: e.target.files?.[0] })} /></Button>
          <Button onClick={handleAddGasto} disabled={loading} className="flex-[3] h-14 bg-slate-900 text-emerald-400 rounded-2xl font-black border-2 border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-xl">{loading ? <Loader2 className="animate-spin" /> : 'AÑADIR GASTO'}</Button>
        </div>
      </section>

      <div className="space-y-3">
        {gastos.map((g, i) => (
          <div key={g.id} className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="text-left relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest">{g.rubro}</span>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${g.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{g.estado}</span>
              </div>
              <p className="font-bold text-slate-800 uppercase text-sm leading-tight">{g.descripcion}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {g.hora} • {g.forma_pago} {g.clienteNombre ? `• ${g.clienteNombre}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <p className="text-xl font-black text-emerald-600">{g.monto.toFixed(2)}€</p>
              {g.estado !== 'Aprobado' && <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-600"><Trash2 size={20} /></Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}