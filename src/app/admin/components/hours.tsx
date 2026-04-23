'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAdminHeader } from './AdminHeaderContext';
import { Loader2, Download, Clock, CheckCircle2, Trash2, Plus, Search, Pencil, FileText, CalendarIcon } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { decimalToTime } from '@/lib/utils';
import ReportGeneratorModal from './ReportGeneratorModal';

// --- DATE PICKER SEGURO ---
function AdminDatePicker({ date, setDate, placeholder }: { date: Date | undefined; setDate: (d: Date | undefined) => void; placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full h-12 justify-start font-bold rounded-xl border-slate-200 bg-slate-50 hover:bg-slate-100 ${date ? 'text-slate-900' : 'text-slate-400'}`}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-2xl" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setIsOpen(false); }} locale={es} initialFocus />
      </PopoverContent>
    </Popover>
  );
}

type HoraItem = {
  id: string; inspectorId: string; inspectorNombre: string; fecha: any;
  estado: 'Registrado' | 'Aprobado'; clienteNombre?: string; actividad?: string;
  horaLlegada?: string; horaSalida?: string;
  horasNormales?: number; horasExtras?: number; horasEspeciales?: number;
};

export default function HoursPage() {
  const db = useFirestore();
  const { setHeaderProps } = useAdminHeader();
  const { toast } = useToast();

  const [records, setRecords] = useState<HoraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'tabla' | 'cliente' | 'fecha'>('tabla');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentEditingRecord, setCurrentEditingRecord] = useState<HoraItem | null>(null);
  const [inspectors, setInspectors] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, [db]);

  const fetchData = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'bitacora_visitas'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HoraItem));
      setRecords(data);
      const uniqueInspectors = Array.from(new Set(data.map(r => r.inspectorNombre))).filter(Boolean);
      setInspectors(uniqueInspectors.sort());
    } catch (error) { toast({ title: "Error al cargar datos", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const matchInspector = filtroInspector === 'todos' || r.inspectorNombre === filtroInspector;
      let matchFecha = true;
      if (fechaDesde && fechaHasta) matchFecha = isWithinInterval(d, { start: startOfDay(fechaDesde), end: endOfDay(fechaHasta) });
      const matchSearch = searchTerm === '' ||
        r.inspectorNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.actividad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clienteNombre?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchInspector && matchFecha && matchSearch;
    });
  }, [records, filtroInspector, fechaDesde, fechaHasta, searchTerm]);

  // --- LÓGICA DE AGRUPACIÓN (CORREGIDA: AHORA DENTRO DEL COMPONENTE) ---
  const groupedByCliente = useMemo(() => {
    return filteredRecords.reduce((acc: Record<string, any[]>, r) => {
      const key = r.clienteNombre || 'Sin Cliente';
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [filteredRecords]);

  const groupedByFecha = useMemo(() => {
    return filteredRecords.reduce((acc: Record<string, any[]>, r) => {
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const key = isNaN(d.getTime()) ? 'Sin Fecha' : format(d, 'dd/MM/yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [filteredRecords]);

  const totalN = filteredRecords.reduce((sum, r) => sum + (Number(r.horasNormales) || 0), 0);
  const totalE = filteredRecords.reduce((sum, r) => sum + (Number(r.horasExtras) || 0), 0);
  const totalS = filteredRecords.reduce((sum, r) => sum + (Number(r.horasEspeciales) || 0), 0);

  useEffect(() => {
    setHeaderProps({
      title: 'Control de Horas de Producción',
      action: (
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase hover:bg-slate-200"><Plus size={14} /> Registrar Horas</Button>
          <Button onClick={() => setIsReportModalOpen(true)} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase hover:bg-slate-200"><FileText size={14} /> Reportes PDF</Button>
          <Button onClick={handleExportExcel} className="h-10 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 font-black text-[10px] gap-2 px-6 uppercase hover:bg-slate-200"><Download size={14} /> Excel</Button>
        </div>
      )
    });
  }, [setHeaderProps, filteredRecords]);

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      Inspector: r.inspectorNombre,
      Fecha: format(r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha), 'dd/MM/yyyy'),
      Cliente: r.clienteNombre,
      Actividad: r.actividad,
      'H. Normales': r.horasNormales || 0,
      'H. Extras': r.horasExtras || 0,
      'H. Especiales': r.horasEspeciales || 0,
      Total: (r.horasNormales || 0) + (r.horasExtras || 0) + (r.horasEspeciales || 0),
      Estado: r.estado
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horas");
    XLSX.writeFile(wb, `Reporte_Horas_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };
  const handleApprove = async (id: string, currentStatus: string) => { /* Approve logic */ };
  const handleDelete = async (id: string) => { /* Delete logic */ };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="space-y-1 w-full md:w-1/3">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <Input placeholder="Técnico, cliente, actividad..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-12 pl-10 rounded-xl border-slate-200 bg-slate-50 text-slate-900 font-bold" />
          </div>
        </div>
        <div className="space-y-1 w-48">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Técnico</label>
          <Select value={filtroInspector} onValueChange={setFiltroInspector}>
            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white"><SelectItem value="todos">TODOS</SelectItem>{inspectors.map(n => <SelectItem key={n} value={n}>{n.split('@')[0].toUpperCase()}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-40">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Desde</label>
          <AdminDatePicker date={fechaDesde} setDate={setFechaDesde} placeholder="Inicio..." />
        </div>
        <div className="space-y-1 w-40">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hasta</label>
          <AdminDatePicker date={fechaHasta} setDate={setFechaHasta} placeholder="Fin..." />
        </div>
        <Button variant="ghost" onClick={() => { setFiltroInspector('todos'); setFechaDesde(undefined); setFechaHasta(undefined); setSearchTerm(''); }} className="h-12 rounded-xl text-slate-400 font-bold">LIMPIAR</Button>

        {/* SELECTOR DE VISTAS */}
        <div className="ml-auto flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
          <button onClick={() => setViewMode('tabla')} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${viewMode === 'tabla' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Tabla</button>
          <button onClick={() => setViewMode('cliente')} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${viewMode === 'cliente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Cliente</button>
          <button onClick={() => setViewMode('fecha')} className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${viewMode === 'fecha' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Fecha</button>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      {viewMode === 'tabla' ? (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#062113] text-white">
                  <th className="px-6 py-4 text-[10px] font-black uppercase border-r border-white/10">Fecha</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase border-r border-white/10">Técnico</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase border-r border-white/10">Cliente / Actividad</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-center border-r border-white/10">Norm.</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-center border-r border-white/10">Extra</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-center border-r border-white/10">Esp.</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase text-center border-r border-white/10 bg-white/5">Total</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-center border-r border-white/10">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-4"><p className="font-bold text-slate-700 text-sm">{format(r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha), 'dd/MM/yyyy')}</p><p className="text-[9px] font-black text-slate-400 uppercase">{r.horaLlegada || '--:--'}</p></td>
                    <td className="px-6 py-4 font-black text-slate-800 text-xs uppercase">{r.inspectorNombre?.split('@')[0]}</td>
                    <td className="px-6 py-4"><p className="font-black text-slate-900 text-xs uppercase">{r.clienteNombre}</p><p className="text-[10px] text-slate-500 font-medium truncate max-w-xs">{r.actividad}</p></td>
                    <td className="px-4 py-4 text-center font-bold text-slate-700 text-xs">{(r.horasNormales || 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-center font-bold text-amber-600 text-xs">{(r.horasExtras || 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-center font-bold text-blue-600 text-xs">{(r.horasEspeciales || 0).toFixed(2)}</td>
                    <td className="px-4 py-4 text-center font-black text-slate-900 text-sm bg-slate-50/50">{((r.horasNormales || 0) + (r.horasExtras || 0) + (r.horasEspeciales || 0)).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${r.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>{r.estado}</span></td>
                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><Button variant="outline" size="icon" onClick={() => { setCurrentEditingRecord(r); setIsEditModalOpen(true); }} className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-100"><Pencil size={18} /></Button>{r.estado !== 'Aprobado' && <Button variant="outline" size="icon" onClick={() => handleApprove(r.id, r.estado)} className="text-emerald-600 h-10 w-10 rounded-xl bg-emerald-50 hover:bg-emerald-100"><CheckCircle2 size={20} /></Button>}<Button variant="outline" size="icon" onClick={() => handleDelete(r.id)} className="text-red-500 h-10 w-10 rounded-xl bg-red-50 hover:bg-red-100"><Trash2 size={20} /></Button></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-4 border-slate-200">
                <tr className="font-black text-slate-900">
                  <td colSpan={3} className="px-6 py-5 text-right uppercase text-[10px] tracking-widest text-slate-500 bg-slate-100/50">Total Producción:</td>
                  <td className="px-4 py-5 text-right text-[#062113] border-l border-slate-200">{totalN.toFixed(2)}</td>
                  <td className="px-4 py-5 text-right text-[#062113] border-l border-slate-200">{totalE.toFixed(2)}</td>
                  <td className="px-4 py-5 text-right text-[#062113] border-l border-slate-200">{totalS.toFixed(2)}</td>
                  <td className="px-4 py-5 text-right bg-[#f1f5f9] text-[#062113] border-l-2 border-slate-300">{(totalN + totalE + totalS).toFixed(2)}</td>
                  <td colSpan={2} className="bg-slate-50"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
          {Object.entries(viewMode === 'cliente' ? groupedByCliente : groupedByFecha).map(([key, items]: [string, any[]]) => {
            const sN = items.reduce((s, r) => s + (Number(r.horasNormales) || 0), 0);
            const sE = items.reduce((s, r) => s + (Number(r.horasExtras) || 0), 0);
            const sS = items.reduce((s, r) => s + (Number(r.horasEspeciales) || 0), 0);
            return (
              <div key={key} className="bg-white rounded-[2rem] shadow-md border border-slate-100 overflow-hidden">
                <div className={`px-5 py-4 border-b flex justify-between items-center ${viewMode === 'fecha' ? 'bg-[#062113] text-white' : 'bg-slate-50'}`}>
                  <h3 className="font-black uppercase tracking-widest text-[10px]">{key}</h3>
                  <span className="text-sm font-black">Total: {(sN + sE + sS).toFixed(2)}h</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Norm.</p><p className="font-bold text-emerald-600">{sN.toFixed(2)}</p></div>
                    <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Ext.</p><p className="font-bold text-amber-600">{sE.toFixed(2)}</p></div>
                    <div className="text-center"><p className="text-[8px] font-black text-slate-400 uppercase">Esp.</p><p className="font-bold text-blue-600">{sS.toFixed(2)}</p></div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto custom-scroll pr-2">
                    {items.map((r, i) => (
                      <div key={i} className="py-2 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-500">{viewMode === 'fecha' ? r.clienteNombre : format(r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha), 'dd/MM')}</span>
                        <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{(Number(r.horasNormales) + Number(r.horasExtras) + Number(r.horasEspeciales)).toFixed(2)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReportGeneratorModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} reportes={records} fixedModule="horas" />

      {/* MODALES CREAR/EDITAR */}
      {isCreateModalOpen && <HoraModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSaved={fetchData} db={db} />}
      {isEditModalOpen && currentEditingRecord && <HoraModal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setCurrentEditingRecord(null); }} record={currentEditingRecord} onSaved={fetchData} db={db} />}
    </div>
  );
}

function HoraModal({ isOpen, onClose, record, onSaved, db }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(record || { inspectorNombre: 'ADMIN@ENERGYENGINE.ES', fecha: new Date().toISOString().split('T')[0], clienteNombre: '', actividad: 'Inspección', horaLlegada: '08:00', horaSalida: '10:00', horasNormales: '0.00', horasExtras: '0.00', horasEspeciales: '0.00' });

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...formData, horasNormales: parseFloat(formData.horasNormales) || 0, horasExtras: parseFloat(formData.horasExtras) || 0, horasEspeciales: parseFloat(formData.horasEspeciales) || 0, fecha: new Date(formData.fecha + 'T12:00:00') };
      if (record) await updateDoc(doc(db, 'bitacora_visitas', record.id), payload);
      else await addDoc(collection(db, 'bitacora_visitas'), { ...payload, estado: 'Registrado', inspectorId: formData.inspectorNombre.toLowerCase(), createdAt: serverTimestamp() });
      onSaved(); onClose();
    } catch (e) { } finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white rounded-[2rem] p-8 border-none shadow-2xl">
        <DialogHeader><DialogTitle className="text-xl font-black uppercase text-slate-900">{record ? 'Editar' : 'Registrar'} Horas</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase ml-1">Fecha</label><input type="date" value={formData.fecha?.split ? formData.fecha.split('T')[0] : new Date(formData.fecha).toISOString().split('T')[0]} onChange={e => setFormData({ ...formData, fecha: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none" /></div>
          <div className="col-span-2 space-y-1"><label className="text-[10px] font-black uppercase ml-1">Cliente</label><Input value={formData.clienteNombre} onChange={e => setFormData({ ...formData, clienteNombre: e.target.value })} className="h-12 rounded-xl bg-slate-50 font-bold" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1">Normales</label><Input type="number" step="0.01" value={formData.horasNormales} onChange={e => setFormData({ ...formData, horasNormales: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-emerald-100 font-bold" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase ml-1">Extras</label><Input type="number" step="0.01" value={formData.horasExtras} onChange={e => setFormData({ ...formData, horasExtras: e.target.value })} className="h-12 rounded-xl bg-slate-50 border-amber-100 font-bold" /></div>
        </div>
        <DialogFooter className="mt-8 flex gap-3"><Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button><Button onClick={handleSave} disabled={loading} className="flex-1 bg-slate-900 text-white">Guardar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}