'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  Loader2, Calendar as CalendarIcon, Download, Eye, 
  CheckCircle2, XCircle, MapPin, ImageIcon, User, Euro 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

// --- TIPOS ---
type GastoInterno = {
  descripcion: string;
  monto: number;
  rubro: string;
  comprobanteUrl?: string;
  clienteNombre?: string;
};

type ReporteGasto = { 
  id: string; 
  fecha: any; 
  inspectorId: string; 
  inspectorNombre: string; 
  observaciones?: string;
  total: number; 
  estado: string; 
  firmaUrl?: string;
  itinerario?: any[];
  gastos?: GastoInterno[];
};

export default function ExpensesPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [reportes, setReportes] = useState<ReporteGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReporteGasto | null>(null);
  
  // Filtros
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    fetchData();
  }, [db]);

  const fetchData = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'gastos'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReporteGasto));
      setReportes(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error al cargar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nuevoEstado: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'gastos', id), { estado: nuevoEstado });
      toast({ title: `Reporte ${nuevoEstado}` });
      setSelectedReport(null);
      fetchData(); // Refrescar lista
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(r => {
      const matchInspector = filtroInspector === 'todos' || r.inspectorId === filtroInspector;
      const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
      return matchInspector && matchEstado;
    });
  }, [reportes, filtroInspector, filtroEstado]);

  const exportToExcel = () => {
    const dataToExport = reportesFiltrados.map(r => ({
      Fecha: r.fecha?.toDate ? format(r.fecha.toDate(), 'dd/MM/yyyy') : r.fecha,
      Inspector: r.inspectorNombre,
      Total: r.total,
      Estado: r.estado,
      Paradas: r.itinerario?.length || 0,
      Observaciones: r.observaciones || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, `Reporte_Gastos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-900 mb-4" size={40} />
      <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Sincronizando Auditoría...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER & FILTROS */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-left w-full md:w-auto">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Auditoría de Gastos</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Energy Engine Management</p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl font-bold border-slate-200">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">TODOS</SelectItem>
                <SelectItem value="Pendiente de Aprobación">PENDIENTES</SelectItem>
                <SelectItem value="Aprobado">APROBADOS</SelectItem>
                <SelectItem value="Rechazado">RECHAZADOS</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportToExcel} variant="outline" className="h-10 rounded-xl font-bold flex gap-2 border-slate-200 hover:bg-slate-50">
              <Download size={16} /> EXCEL
            </Button>
          </div>
        </div>

        {/* TABLA DE REPORTES */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Inspector</th>
                  <th className="px-6 py-4">Paradas</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportesFiltrados.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-600 text-xs uppercase">
                      {report.fecha?.toDate ? format(report.fecha.toDate(), 'dd MMM yy', { locale: es }) : report.fecha}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-[10px]">
                          {report.inspectorNombre?.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-black text-slate-800 text-xs uppercase">{report.inspectorNombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-400 text-xs">
                      {report.itinerario?.length || 0} LOC
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 text-sm">
                      {report.total?.toFixed(2)} €
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        report.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 
                        report.estado === 'Rechazado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {report.estado?.split(' ')[0] || 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedReport(report)}
                        className="rounded-xl font-black text-[10px] gap-1 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all"
                      >
                        <Eye size={14} /> REVISAR
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLE / AUDITORÍA */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none bg-slate-50 text-left">
          {selectedReport && (
            <div className="space-y-0">
              {/* Header Modal */}
              <div className="bg-slate-900 p-8 text-white rounded-t-[2.5rem]">
                <div className="flex justify-between items-end">
                  <div>
                    <Badge className="bg-emerald-500 mb-2 font-black uppercase">Detalle de Jornada</Badge>
                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedReport.inspectorNombre}</h2>
                    <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">
                       {selectedReport.fecha?.toDate ? format(selectedReport.fecha.toDate(), 'PPPP', { locale: es }) : selectedReport.fecha}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-black text-4xl">{selectedReport.total?.toFixed(2)}€</p>
                    <p className="text-slate-500 font-bold text-[10px] uppercase">Gasto Acumulado</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Paradas */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <MapPin size={14} /> Itinerario de Trabajo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedReport.itinerario?.map((stop: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-black text-slate-800 text-[11px] uppercase">{stop.clienteNombre}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{stop.hora} • {stop.actividad}</p>
                        </div>
                        {stop.ubicacion && (
                          <a href={`https://www.google.com/maps?q=${stop.ubicacion.lat},${stop.ubicacion.lon}`} target="_blank" className="p-2 bg-slate-50 rounded-xl text-primary hover:bg-slate-100">
                            <MapPin size={16} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gastos Desglosados */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Euro size={14} /> Comprobantes y Tickets
                  </h3>
                  <div className="space-y-3">
                    {selectedReport.gastos?.map((g: any, idx: number) => (
                      <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-4 text-left">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                            <ImageIcon size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 uppercase text-xs">{g.descripcion}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{g.rubro} • Pago: {g.forma_pago || 'Empresa'}</p>
                            {g.comprobanteUrl && (
                              <a href={g.comprobanteUrl} target="_blank" className="text-emerald-600 font-black text-[10px] uppercase mt-2 flex items-center gap-1 hover:underline">
                                <Eye size={12} /> Ver ticket adjunto
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0">
                          <p className="text-xl font-black text-slate-900">{g.monto?.toFixed(2)}€</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Firma y Observaciones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-t border-slate-200">
                  <div className="text-left">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</h4>
                    <p className="text-sm font-medium text-slate-600 italic">"{selectedReport.observaciones || 'Sin notas adicionales'}"</p>
                  </div>
                  <div className="text-center bg-white p-4 rounded-3xl border border-slate-100 shadow-inner">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Firma Digital</h4>
                    {selectedReport.firmaUrl ? <img src={selectedReport.firmaUrl} className="h-24 mx-auto" alt="Firma" /> : <p className="text-slate-300 font-bold uppercase text-[10px]">No firmada</p>}
                  </div>
                </div>

                {/* Acciones Finales */}
                <div className="flex gap-4 pt-4">
                  <Button 
                    onClick={() => handleUpdateStatus(selectedReport.id, 'Aprobado')}
                    className="flex-1 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg gap-2 shadow-lg shadow-emerald-100 transition-all"
                  >
                    <CheckCircle2 size={24} /> APROBAR
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus(selectedReport.id, 'Rechazado')}
                    variant="outline"
                    className="flex-1 h-16 border-2 border-red-200 text-red-500 hover:bg-red-50 rounded-2xl font-black text-lg gap-2 transition-all"
                  >
                    <XCircle size={24} /> RECHAZAR
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${className}`}>
      {children}
    </span>
  )
}