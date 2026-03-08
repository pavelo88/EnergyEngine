'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Filter, Loader2, DollarSign, User, Briefcase, Calendar } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// --- Tipos de Datos ---
type Gasto = { id: string; fecha: any; inspectorNombre: string; clienteNombre: string; descripcion: string; categoria: string; monto: number; estado: string; };
type Inspector = { id: string; nombre: string; };
type Cliente = { id: string; nombre: string; };

export default function ExpensesPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [inspectores, setInspectores] = useState<Inspector[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  // --- Estados de los Filtros ---
  const [filtroInspector, setFiltroInspector] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('all');
  const [filtroFecha, setFiltroFecha] = useState<DateRange | undefined>({ from: addDays(new Date(), -30), to: new Date() });

  // --- Carga de Datos Inicial (Gastos, Inspectores, Clientes) ---
  useEffect(() => {
    if (!db) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // Cargar Inspectores
        const qInspectores = query(collection(db, 'usuarios'), where("roles", "array-contains", "inspector"));
        const inspectoresSnap = await getDocs(qInspectores);
        setInspectores(inspectoresSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));

        // Cargar Clientes
        const clientesSnap = await getDocs(collection(db, 'clientes'));
        setClientes(clientesSnap.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));

        // Cargar Gastos
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

  // --- Lógica de Filtrado ---
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(gasto => {
      const fechaGasto = gasto.fecha.toDate();
      const enRangoFecha = filtroFecha?.from && filtroFecha?.to ? (fechaGasto >= filtroFecha.from && fechaGasto <= filtroFecha.to) : true;
      const matchInspector = filtroInspector === 'all' || gasto.inspectorNombre === filtroInspector;
      const matchCliente = filtroCliente === 'all' || gasto.clienteNombre === filtroCliente;
      return enRangoFecha && matchInspector && matchCliente;
    });
  }, [gastos, filtroInspector, filtroCliente, filtroFecha]);

  // --- Lógica de Resumen ---
  const totalGastado = useMemo(() => {
    return gastosFiltrados.reduce((acc, gasto) => acc + gasto.monto, 0);
  }, [gastosFiltrados]);

  return (
    <div className="bg-slate-50 p-4 sm:p-6 md:p-8 h-full">
      <div className="max-w-7xl mx-auto">
        {/* --- Cabecera --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Reporte de Gastos</h1>
          <p className="mt-1 text-slate-600">Visualiza y filtra los gastos registrados por el equipo.</p>
        </div>

        {/* --- Filtros --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm">
          {/* Filtro por Inspector */}
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inspector</label>
              <Select value={filtroInspector} onValueChange={setFiltroInspector}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos los Inspectores</SelectItem>
                      {inspectores.map(i => <SelectItem key={i.id} value={i.nombre}>{i.nombre}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          {/* Filtro por Cliente */}
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos los Clientes</SelectItem>
                      {clientes.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          {/* Filtro por Fecha */}
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rango de Fechas</label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4"/>
                          {filtroFecha?.from ? `${filtroFecha.from.toLocaleDateString()} - ${filtroFecha.to?.toLocaleDateString()}`: <span>Selecciona un rango</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                      <CalendarComponent mode="range" selected={filtroFecha} onSelect={setFiltroFecha} numberOfMonths={2}/>
                  </PopoverContent>
              </Popover>
          </div>
          {/* Resumen Total */}
          <div className='bg-slate-100 p-4 rounded-lg flex items-center justify-center'>
              <div>
                <p className='text-sm text-slate-500 font-medium'>Total Gastado</p>
                <p className='text-2xl font-bold text-slate-800'>${totalGastado.toFixed(2)}</p>
              </div>
          </div>
        </div>

        {/* --- Tabla de Gastos --- */}
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100"><tr><th className="p-4 text-sm font-semibold text-slate-600">Fecha</th><th className="p-4 text-sm font-semibold text-slate-600">Inspector</th><th className="p-4 text-sm font-semibold text-slate-600">Cliente</th><th className="p-4 text-sm font-semibold text-slate-600">Descripción</th><th className="p-4 text-sm font-semibold text-slate-600">Monto</th></tr></thead>
              <tbody>
                {gastosFiltrados.map((gasto) => (
                  <tr key={gasto.id} className="border-b border-slate-100">
                    <td className="p-4 text-slate-700">{gasto.fecha.toDate().toLocaleDateString()}</td>
                    <td className="p-4"><div className="font-medium text-slate-900">{gasto.inspectorNombre}</div></td>
                    <td className="p-4 text-slate-700">{gasto.clienteNombre}</td>
                    <td className="p-4 text-slate-700">{gasto.descripcion}</td>
                    <td className="p-4 font-medium text-right text-slate-800">${gasto.monto.toFixed(2)}</td>
                  </tr>
                ))}
                {gastosFiltrados.length === 0 && (<tr><td colSpan={5} className="text-center p-8 text-slate-500">No hay gastos que coincidan con los filtros seleccionados.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
