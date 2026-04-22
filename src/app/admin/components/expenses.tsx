'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useAdminHeader } from './AdminHeaderContext';
import {
  Loader2, Download, Eye, Euro, Clock, User, Calendar as CalendarIcon, CheckCircle2, XCircle, Trash2, Plus, Filter, Search, Pencil, FileText
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, isAfter, isBefore, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { decimalToTime } from '@/lib/utils';
import ReportGeneratorModal from './ReportGeneratorModal';

// --- TIPOS DE DATOS ---
type RecordItem = {
  id: string;
  inspectorId: string;
  inspectorNombre: string;
  fecha: any;
  fechaStr?: string;
  estado: 'Registrado' | 'Aprobado';
  // Campos de Gasto
  rubro?: string;
  monto?: number;
  descripcion?: string;
  forma_pago?: string;
  hora?: string;
  comprobanteUrl?: string;
  // Campos de Hora/Visita
  clienteNombre?: string;
  actividad?: string;
  horaLlegada?: string;
  horaSalida?: string;
  horasNormales?: number;
  horasExtras?: number;
  horasEspeciales?: number;
  motorUrl?: string;
};

export default function ExpensesPage() {
  const db = useFirestore();
  const pathname = usePathname();
  const { setHeaderProps } = useAdminHeader();
  const isHoursMode = pathname?.includes('hours');
  const { toast } = useToast();

  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentEditingRecord, setCurrentEditingRecord] = useState<RecordItem | null>(null);

  const [inspectors, setInspectors] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [db, isHoursMode]);

  const fetchData = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const collectionName = isHoursMode ? 'bitacora_visitas' : 'gastos_detalle';
      const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RecordItem));
      setRecords(data);

      const uniqueInspectors = Array.from(new Set(data.map(r => r.inspectorNombre))).filter(Boolean);
      setInspectors(uniqueInspectors.sort());
    } catch (error) {
      console.error(error);
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const matchInspector = filtroInspector === 'todos' || r.inspectorId === filtroInspector || r.inspectorNombre === filtroInspector;
      let matchFecha = true;
      if (fechaDesde && fechaHasta) {
        matchFecha = isWithinInterval(d, { start: startOfDay(fechaDesde), end: endOfDay(fechaHasta) });
      }
      const matchSearch = searchTerm === '' ||
        r.inspectorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchInspector && matchFecha && matchSearch;
    });
  }, [records, filtroInspector, fechaDesde, fechaHasta, searchTerm]);

  useEffect(() => {
    setHeaderProps({
      title: isHoursMode ? 'Control de Horas Individual' : 'Gastos Individuales',
      action: (
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase tracking-widest hover:bg-slate-200 transition-all">
            <Plus size={14} /> Crear Registro
          </Button>
          <Button onClick={() => setIsReportModalOpen(true)} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase tracking-widest hover:bg-slate-200 transition-all">
            <FileText size={14} /> Reportes PDF
          </Button>
          <Button onClick={handleExportExcel} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase tracking-widest hover:bg-slate-200 transition-all">
            <Download size={14} /> Excel
          </Button>
        </div>
      )
    });
  }, [isHoursMode, setHeaderProps]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return toast({ title: "No hay datos para exportar", variant: "destructive" });

    const wb = XLSX.utils.book_new();
    let totalN = 0, totalE = 0, totalS = 0, totalM = 0;

    // SOLUCIÓN TS: Forzamos a que data sea un array de any para evitar restricciones estrictas
    const data: any[] = filteredRecords.map(r => {
      const f = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const fStr = isNaN(f.getTime()) ? '--' : format(f, 'dd/MM/yyyy');

      if (isHoursMode) {
        const n = r.horasNormales || 0;
        const e = r.horasExtras || 0;
        const s = r.horasEspeciales || 0;
        totalN += n; totalE += e; totalS += s;
        return {
          'TÉCNICO': r.inspectorNombre || 'N/A',
          'FECHA': fStr,
          'CLIENTE': r.clienteNombre || 'N/A',
          'ACTIVIDAD': r.actividad || 'N/A',
          'LLEGADA': r.horaLlegada || '--:--',
          'SALIDA': r.horaSalida || '--:--',
          'NORMALES': n.toFixed(2),
          'EXTRAS': e.toFixed(2),
          'ESPECIALES': s.toFixed(2),
          'TOTAL': (n + e + s).toFixed(2),
          'ESTADO': r.estado
        };
      } else {
        const m = r.monto || 0;
        totalM += m;
        return {
          'TÉCNICO': r.inspectorNombre || 'N/A',
          'FECHA': fStr,
          'RUBRO': r.rubro || 'N/A',
          'CONCEPTO': r.descripcion || 'N/A',
          'MONTO (€)': m.toFixed(2),
          'PAGO': r.forma_pago || 'Empresa',
          'ESTADO': r.estado
        };
      }
    });

    // Añadir fila de totales
    if (isHoursMode) {
      data.push({
        'TÉCNICO': '---', 'FECHA': '---', 'CLIENTE': '---', 'ACTIVIDAD': 'TOTALES',
        'LLEGADA': '', 'SALIDA': '',
        'NORMALES': totalN.toFixed(2),
        'EXTRAS': totalE.toFixed(2),
        'ESPECIALES': totalS.toFixed(2),
        'TOTAL': (totalN + totalE + totalS).toFixed(2),
        'ESTADO': '---'
      });
    } else {
      data.push({
        'TÉCNICO': '---', 'FECHA': '---', 'RUBRO': '---', 'CONCEPTO': 'TOTAL GENERAL',
        'MONTO (€)': totalM.toFixed(2),
        'PAGO': '---', 'ESTADO': '---'
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, isHoursMode ? "HORAS" : "GASTOS");
    XLSX.writeFile(wb, `${isHoursMode ? 'Reporte_Horas' : 'Reporte_Gastos'}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleApprove = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Aprobado') return;
    try {
      const collectionName = isHoursMode ? 'bitacora_visitas' : 'gastos_detalle';
      await updateDoc(doc(db!, collectionName, id), {
        estado: 'Aprobado',
        fecha_aprobacion: serverTimestamp(),
        aprobadoPor: 'Admin'
      });
      setRecords(records.map(r => r.id === id ? { ...r, estado: 'Aprobado' } : r));
      toast({ title: "Registro Aprobado ✅" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar permanentemente este registro?")) return;
    try {
      const collectionName = isHoursMode ? 'bitacora_visitas' : 'gastos_detalle';
      await deleteDoc(doc(db!, collectionName, id));
      setRecords(records.filter(r => r.id !== id));
      toast({ title: "Registro Eliminado" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <Input placeholder="Técnico, cliente, concepto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-12 pl-10 rounded-xl border-slate-200" />
          </div>
        </div>

        <div className="space-y-1 w-48">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Técnico</label>
          <Select value={filtroInspector} onValueChange={setFiltroInspector}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="todos">TODOS</SelectItem>
              {inspectors.map(name => <SelectItem key={name} value={name}>{name.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 w-40 justify-start font-bold hover:bg-slate-50 focus:ring-2 focus:ring-emerald-500">{fechaDesde ? format(fechaDesde, 'dd/MM/yy') : '---'}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border border-slate-200 bg-white" align="start">
              <div className="p-1 bg-white rounded-2xl">
                <Calendar
                  mode="single"
                  selected={fechaDesde}
                  onSelect={setFechaDesde}
                  locale={es}
                  initialFocus
                  className="rounded-2xl bg-white text-slate-900"
                  classNames={{
                    day_today: "bg-slate-100 text-slate-900 font-bold",
                    day_selected: "bg-emerald-500 text-white hover:bg-emerald-600",
                    day: "text-slate-700 hover:bg-slate-100 rounded-lg w-9 h-9 font-medium",
                    head_cell: "text-slate-400 font-black uppercase text-[10px] w-9",
                    nav_button: "hover:bg-slate-100 rounded-lg text-slate-400"
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
          <Popover>
            <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-2xl rounded-2xl"><Calendar mode="single" selected={fechaHasta} onSelect={setFechaHasta} locale={es} className="bg-white text-slate-900" /></PopoverContent>
          </Popover>
        </div>

        <Button variant="ghost" onClick={() => { setFiltroInspector('todos'); setFechaDesde(undefined); setFechaHasta(undefined); setSearchTerm(''); }} className="h-12 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 px-4 font-bold">LIMPIAR</Button>
      </div>

      {/* TABLA DE REGISTROS INDIVIDUALES */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-900 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-slate-100">Fecha</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-slate-100">Técnico</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest border-r border-slate-100">{isHoursMode ? 'Cliente / Actividad' : 'Rubro / Concepto'}</th>
                {isHoursMode ? (
                  <>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100 italic text-emerald-600">Norm.</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100 italic text-amber-600">Extra</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100 italic text-blue-600">Esp.</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100 bg-slate-100">Total</th>
                  </>
                ) : (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100">Monto</th>
                )}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-100">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 text-sm">{format(r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha), 'dd/MM/yyyy')}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">{r.hora || r.horaLlegada || '--:--'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">{r.inspectorNombre?.[0]}</div>
                      <p className="font-black text-slate-800 text-xs uppercase">{r.inspectorNombre}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 text-xs uppercase">{isHoursMode ? r.clienteNombre : r.rubro}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate max-w-xs">{isHoursMode ? r.actividad : r.descripcion}</p>
                  </td>
                  {isHoursMode ? (
                    <>
                      <td className="px-4 py-4 text-center font-bold text-slate-700 text-xs border-r border-slate-50">{(r.horasNormales || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-center font-bold text-amber-600 text-xs border-r border-slate-50">{(r.horasExtras || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-center font-bold text-blue-600 text-xs border-r border-slate-50">{(r.horasEspeciales || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 text-center font-black text-slate-900 text-sm border-r border-slate-50 bg-slate-50/50">{((r.horasNormales || 0) + (r.horasExtras || 0) + (r.horasEspeciales || 0)).toFixed(2)}</td>
                    </>
                  ) : (
                    <td className="px-6 py-4 text-center font-black text-emerald-600 text-lg">
                      {r.monto?.toFixed(2)}€
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${r.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => { setCurrentEditingRecord(r); setIsEditModalOpen(true); }} className="text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 h-10 w-10 rounded-xl">
                        <Pencil size={18} />
                      </Button>
                      {r.estado !== 'Aprobado' && (
                        <Button variant="outline" size="icon" onClick={() => handleApprove(r.id, r.estado)} className="text-emerald-600 border-emerald-100 bg-emerald-50 hover:bg-emerald-100 h-10 w-10 rounded-xl transition-all">
                          <CheckCircle2 size={20} />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" onClick={() => handleDelete(r.id)} className="text-red-500 border-red-50 hover:bg-red-50 h-10 w-10 rounded-xl shadow-sm transition-all">
                        <Trash2 size={20} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest italic">No se encontraron registros</div>}
        </div>
      </div>

      <ReportGeneratorModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reportes={records} />

      {isCreateModalOpen && <CreateRecordModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} isHours={isHoursMode} onCreated={fetchData} />}

      {isEditModalOpen && currentEditingRecord && (
        <EditRecordModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setCurrentEditingRecord(null); }}
          record={currentEditingRecord}
          isHours={isHoursMode}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}

// ────────── COMPONENTE: EDITAR REGISTRO ──────────
function EditRecordModal({ isOpen, onClose, record, isHours, onUpdated }: any) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ ...record });

  const handleUpdate = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const collectionName = isHours ? 'bitacora_visitas' : 'gastos_detalle';

      const payload = isHours ? {
        clienteNombre: formData.clienteNombre,
        actividad: formData.actividad,
        horaLlegada: formData.horaLlegada,
        horaSalida: formData.horaSalida,
        horasNormales: parseFloat(formData.horasNormales) || 0,
        horasExtras: parseFloat(formData.horasExtras) || 0,
        horasEspeciales: parseFloat(formData.horasEspeciales) || 0,
        hNormalesStr: decimalToTime(parseFloat(formData.horasNormales)),
        hExtrasStr: decimalToTime(parseFloat(formData.horasExtras)),
        hEspecialesStr: decimalToTime(parseFloat(formData.horasEspeciales))
      } : {
        rubro: formData.rubro,
        monto: parseFloat(formData.monto) || 0,
        descripcion: formData.descripcion,
        forma_pago: formData.forma_pago,
        hora: formData.hora
      };

      await updateDoc(doc(db, collectionName, record.id), payload);
      toast({ title: "Registro Actualizado" });
      onUpdated();
      onClose();
    } catch (e) { toast({ variant: 'destructive', title: 'Error al actualizar' }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-[2rem] p-8 border-none shadow-2xl">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-900 border-b pb-4">Editar {isHours ? 'Registro de Visita' : 'Liquidación de Gasto'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-6">
          {isHours ? (
            <>
              <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Cliente / Proyecto</label><Input value={formData.clienteNombre} onChange={e => setFormData({ ...formData, clienteNombre: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Hora de Llegada</label><Input value={formData.horaLlegada} onChange={e => setFormData({ ...formData, horaLlegada: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Hora de Salida</label><Input value={formData.horaSalida} onChange={e => setFormData({ ...formData, horaSalida: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Horas Normales</label><Input type="number" step="0.01" value={formData.horasNormales} onChange={e => setFormData({ ...formData, horasNormales: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-emerald-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Horas Extras</label><Input type="number" step="0.01" value={formData.horasExtras} onChange={e => setFormData({ ...formData, horasExtras: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-amber-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Horas Especiales</label><Input type="number" step="0.01" value={formData.horasEspeciales} onChange={e => setFormData({ ...formData, horasEspeciales: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-blue-100 text-slate-900 font-bold" /></div>
            </>
          ) : (
            <>
              <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Concepto del Gasto</label><Input value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Importe (€)</label><Input type="number" step="0.01" value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1 text-slate-400">Hora</label><Input type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold" /></div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase ml-1 text-slate-400">Categoría / Rubro</label>
                <Select value={formData.rubro} onValueChange={v => setFormData({ ...formData, rubro: v })}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 text-slate-900 font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">{['Combustible', 'Peajes', 'Parking', 'Manutención', 'Obras', 'Otros'].map(r => <SelectItem key={r} value={r} className="text-slate-900">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="mt-8 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="h-12 px-6 rounded-xl font-black text-[10px] uppercase text-slate-400">Cancelar</Button>
          <Button onClick={handleUpdate} disabled={loading} className="h-12 bg-slate-900 text-emerald-400 rounded-xl px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/10 transition-all hover:scale-105 active:scale-95">{loading ? 'Procesando...' : 'Guardar Cambios'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────── COMPONENTE INTERNO: MODAL CREACIÓN ──────────
function CreateRecordModal({ isOpen, onClose, isHours, onCreated }: any) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    inspectorNombre: 'Admin',
    fecha: new Date(),
    // Gastos
    rubro: 'Otros', monto: '', descripcion: '', forma_pago: 'Efectivo', hora: '12:00',
    // Horas
    clienteNombre: '', actividad: 'Inspección', horaLlegada: '08:00', horaSalida: '10:00', hNormales: '02:00', hExtras: '00:00'
  });

  const handleSave = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const collectionName = isHours ? 'bitacora_visitas' : 'gastos_detalle';
      const common = {
        inspectorId: 'admin@energyengine.es',
        inspectorNombre: formData.inspectorNombre,
        fecha: formData.fecha,
        fechaStr: format(formData.fecha, 'yyyy-MM-dd'),
        estado: 'Registrado',
        createdAt: serverTimestamp(),
        manual: true
      };

      const payload = isHours ? {
        ...common,
        clienteNombre: formData.clienteNombre,
        actividad: formData.actividad,
        horaLlegada: formData.horaLlegada,
        horaSalida: formData.horaSalida,
        horasNormales: parseFloat(formData.hNormales.replace(':', '.')) || 0,
        horasExtras: parseFloat(formData.hExtras.replace(':', '.')) || 0
      } : {
        ...common,
        rubro: formData.rubro,
        monto: parseFloat(formData.monto) || 0,
        descripcion: formData.descripcion,
        forma_pago: formData.forma_pago,
        hora: formData.hora
      };

      await addDoc(collection(db, collectionName), payload);
      toast({ title: "Registro Creado" });
      onCreated();
      onClose();
    } catch (e) { toast({ variant: 'destructive', title: 'Error' }); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-[2rem] p-8">
        <DialogTitle className="text-xl font-black uppercase">Crear {isHours ? 'Visita' : 'Gasto'} Manual</DialogTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase">Fecha</label>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" className="w-full h-12 rounded-xl justify-start">{format(formData.fecha, 'dd/MM/yyyy')}</Button></PopoverTrigger>
              <PopoverContent className="bg-white"><Calendar mode="single" selected={formData.fecha} onSelect={(d) => d && setFormData({ ...formData, fecha: d })} /></PopoverContent>
            </Popover>
          </div>
          {isHours ? (
            <>
              <div className="col-span-2"><Input placeholder="CLIENTE" value={formData.clienteNombre} onChange={e => setFormData({ ...formData, clienteNombre: e.target.value })} className="h-12 rounded-xl" /></div>
              <div><Input placeholder="LLEGADA" value={formData.horaLlegada} onChange={e => setFormData({ ...formData, horaLlegada: e.target.value })} className="h-12 rounded-xl" /></div>
              <div><Input placeholder="SALIDA" value={formData.horaSalida} onChange={e => setFormData({ ...formData, horaSalida: e.target.value })} className="h-12 rounded-xl" /></div>
            </>
          ) : (
            <>
              <div className="col-span-2"><Input placeholder="CONCEPTO" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className="h-12 rounded-xl" /></div>
              <div><Input placeholder="MONTO (€)" type="number" value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} className="h-12 rounded-xl" /></div>
              <div><Input placeholder="HORA" type="time" value={formData.hora} onChange={e => setFormData({ ...formData, hora: e.target.value })} className="h-12 rounded-xl" /></div>
            </>
          )}
        </div>
        <DialogFooter className="mt-8">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-emerald-400 rounded-xl px-8 font-black uppercase text-xs">{loading ? 'Guardando...' : 'Guardar Registro'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}