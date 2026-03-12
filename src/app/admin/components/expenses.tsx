'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, Calendar, Download } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import * as XLSX from 'xlsx';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAdminHeader } from './AdminHeaderContext';

type Gasto = { id: string; fecha: any; inspectorId: string; inspectorNombre: string; clienteNombre: string; descripcion: string; categoria: string; monto: number; estado: string; forma_pago: string, comprobanteUrl?: string };
type Inspector = { id: string; nombre: string; };

export default function ExpensesPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [inspectores, setInspectores] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  const [filtroInspector, setFiltroInspector] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [filtroFecha, setFiltroFecha] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(gasto => {
      let fechaGasto: Date;
      
      // Normalización robusta de la fecha del gasto
      if (gasto.fecha?.toDate) {
        fechaGasto = gasto.fecha.toDate();
      } else if (gasto.fecha instanceof Date) {
        fechaGasto = gasto.fecha;
      } else {
        fechaGasto = new Date(gasto.fecha);
      }

      // Filtro de fecha con normalización de inicio y fin de día
      const enRangoFecha = filtroFecha?.from && filtroFecha?.to 
        ? isWithinInterval(fechaGasto, { 
            start: startOfDay(filtroFecha.from), 
            end: endOfDay(filtroFecha.to) 
          })
        : true;

      const matchInspector = filtroInspector === 'all' || gasto.inspectorId === filtroInspector;
      const matchCliente = filtroCliente === 'all' || gasto.clienteNombre === filtroCliente;
      
      return enRangoFecha && matchInspector && matchCliente;
    });
  }, [gastos, filtroInspector, filtroCliente, filtroFecha]);

  const handleExport = useCallback(() => {
    const dataToExport = gastosFiltrados.map(g => ({
        Fecha: format(g.fecha?.toDate ? g.fecha.toDate() : new Date(g.fecha), 'dd/MM/yyyy'),
        Inspector: g.inspectorNombre,
        Cliente: g.clienteNombre,
        Concepto: g.descripcion,
        Monto: g.monto,
        Estado: g.estado,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gastos");
    XLSX.writeFile(workbook, `Reporte_Gastos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [gastosFiltrados]);

  const headerAction = useMemo(() => (
    <Button onClick={handleExport} className="rounded-xl font-bold uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg active:scale-95 transition-all">
        <Download className="mr-2" size={16} />
        Exportar Reporte
    </Button>
  ), [handleExport]);

  useAdminHeader('Control de Gastos', headerAction);

  useEffect(() => {
    if (!db) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const qInspectors = query(collection(db, 'usuarios'), where("roles", "array-contains", "inspector"));
        const inspectoresSnap = await getDocs(qInspectors);
        setInspectores(inspectoresSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));

        const gastosSnap = await getDocs(query(collection(db, 'gastos'), orderBy('fecha', 'desc')));
        setGastos(gastosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gasto)));
      } catch (error) {
        console.error("Error al cargar datos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [db]);

  const totalGastado = useMemo(() => {
    return gastosFiltrados.reduce((acc, gasto) => acc + (gasto.monto || 0), 0);
  }, [gastosFiltrados]);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 items-end">
          <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Inspector Técnico</label>
              <Select value={filtroInspector} onValueChange={setFiltroInspector}>
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold h-12"><SelectValue/></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="all">Todos los técnicos</SelectItem>
                      {inspectores.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Lugar / Destino</label>
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold h-12"><SelectValue/></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="all">Todos los lugares</SelectItem>
                      {[...new Set(gastos.map(g => g.clienteNombre))].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Periodo Temporal</label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-bold rounded-xl h-12 bg-slate-50 border-slate-100">
                          <Calendar className="mr-2 h-4 w-4 text-primary"/>
                          <span className="text-xs uppercase truncate">
                            {filtroFecha?.from ? `${format(filtroFecha.from, 'dd/MM/yy')} - ${filtroFecha.to ? format(filtroFecha.to, 'dd/MM/yy') : ''}`: 'Rango de fechas'}
                          </span>
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-[2rem] overflow-hidden shadow-2xl border-none" align="start">
                      <CalendarComponent mode="range" selected={filtroFecha} onSelect={setFiltroFecha} numberOfMonths={2} />
                  </PopoverContent>
              </Popover>
          </div>
          <div className='bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col justify-center h-12'>
              <p className='text-[9px] text-primary/60 font-black uppercase tracking-widest leading-none mb-1'>Total Filtrado</p>
              <p className='text-xl font-black text-primary leading-none tracking-tighter'>{totalGastado.toFixed(2)} €</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4">Fecha</th>
                  <th className="pb-4">Inspector</th>
                  <th className="pb-4">Destino</th>
                  <th className="pb-4">Descripción</th>
                  <th className="pb-4 text-right">Monto</th>
                  <th className="pb-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {gastosFiltrados.map((gasto) => (
                  <tr key={gasto.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {format(gasto.fecha?.toDate ? gasto.fecha.toDate() : new Date(gasto.fecha), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-4 font-black text-slate-700">{gasto.inspectorNombre}</td>
                    <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{gasto.clienteNombre}</td>
                    <td className="py-4 text-sm text-slate-600 font-medium">{gasto.descripcion}</td>
                    <td className="py-4 font-black text-right text-slate-800">{gasto.monto.toFixed(2)} €</td>
                    <td className="py-4 text-right">
                        <span className={`px-2 py-1 text-[9px] font-black rounded-full uppercase tracking-tighter
                          ${gasto.estado === 'Pendiente de Aprobación' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {gasto.estado === 'Pendiente de Aprobación' ? 'Pendiente' : 'Aprobado'}
                        </span>
                    </td>
                  </tr>
                ))}
                {gastosFiltrados.length === 0 && (<tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No se registran gastos con estos criterios.</td></tr>)}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}
