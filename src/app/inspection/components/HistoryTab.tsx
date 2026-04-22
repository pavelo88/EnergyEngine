'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Clock, Loader2, ArrowRight, MapPin,
  X, TrendingUp, ClipboardCheck, Star
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as localDb } from '@/lib/db-local';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { decimalToTime } from '@/lib/utils';

interface Task {
  id: string;
  clienteNombre?: string;
  cliente?: string;
  instalacion?: string;
  estado: string;
  fecha_creacion?: any;
  firebaseId?: string;
  synced?: boolean;
  createdAt?: Date;
  itinerario?: any[];
  gastos?: any[];
  [key: string]: any;
}

type FilterType = 'asignado' | 'registrado' | 'aprobado';

// ────────── DETAIL MODAL ──────────
function ReportDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const stops = task.itinerario || [];
  const gastos = task.gastos || [];

  const totalN = stops.reduce((s: number, p: any) => s + (p.horasNormales || 0), 0);
  const totalE = stops.reduce((s: number, p: any) => s + (p.horasExtras || 0), 0);
  const totalS = stops.reduce((s: number, p: any) => s + (p.horasEspeciales || 0), 0);
  const totalHrs = totalN + totalE + totalS;

  // Group expenses by rubro
  const gastosByRubro = gastos.reduce((acc: Record<string, any[]>, g: any) => {
    const rubro = g.rubro || 'Otros';
    if (!acc[rubro]) acc[rubro] = [];
    acc[rubro].push(g);
    return acc;
  }, {});

  const totalGastos = gastos.reduce((s: number, g: any) => s + (parseFloat(g.monto) || 0), 0);

  const getEstadoColor = (estado: string) => {
    if (estado === 'Aprobado') return 'bg-emerald-500 text-white';
    if (estado === 'Preaprobado' || estado === 'Registrado' || estado === 'Completado') return 'bg-blue-500 text-white';
    return 'bg-orange-400 text-white';
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#062113] text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Informe Técnico Detallado</p>
              <h2 className="text-xl font-black uppercase">{task.clienteNombre || task.cliente || 'Cliente'}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${getEstadoColor(task.estado)}`}>
                {task.estado === 'En Progreso' ? 'PROCESANDO' : task.estado}
              </span>
              <button onClick={onClose} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* HOURS TABLE */}
          {stops.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Clock size={14} className="text-emerald-500" /> Registro de Horas
                </h3>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Total: {decimalToTime(totalHrs)}
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left px-4 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Cliente</th>
                      <th className="text-left px-4 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">Actividad</th>
                      <th className="text-center px-3 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap text-emerald-400">H. Normales</th>
                      <th className="text-center px-3 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap text-yellow-400">H. Extras</th>
                      <th className="text-center px-3 py-3 font-black uppercase text-[10px] tracking-widest whitespace-nowrap text-blue-400">H. Especiales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stops.map((stop: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{stop.clienteNombre || '–'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap max-w-[160px] truncate">{stop.actividad || '–'}</td>
                        <td className="px-3 py-3 text-center font-black text-emerald-600 whitespace-nowrap">{decimalToTime(stop.horasNormales || 0)}</td>
                        <td className="px-3 py-3 text-center font-black text-yellow-600 whitespace-nowrap">{decimalToTime(stop.horasExtras || 0)}</td>
                        <td className="px-3 py-3 text-center font-black text-blue-600 whitespace-nowrap">{decimalToTime(stop.horasEspeciales || 0)}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={2} className="px-4 py-3 font-black text-[11px] uppercase tracking-widest">Total Jornada</td>
                      <td className="px-3 py-3 text-center font-black text-emerald-400">{decimalToTime(totalN)}</td>
                      <td className="px-3 py-3 text-center font-black text-yellow-400">{decimalToTime(totalE)}</td>
                      <td className="px-3 py-3 text-center font-black text-blue-400">{decimalToTime(totalS)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* EXPENSES TABLE */}
          {gastos.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" /> Gastos Liquidados
                </h3>
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  Total: {totalGastos.toFixed(2)}€
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(gastosByRubro).map(([rubro, items]: [string, any[]]) => {
                  const subtotal = items.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
                  return (
                    <div key={rubro} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest">{rubro}</span>
                        <span className="text-[10px] font-black text-emerald-400">{subtotal.toFixed(2)}€</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-4 py-2 font-black text-[9px] uppercase text-slate-400 tracking-widest whitespace-nowrap">Concepto</th>
                              <th className="text-right px-4 py-2 font-black text-[9px] uppercase text-slate-400 tracking-widest whitespace-nowrap">Monto</th>
                              <th className="text-center px-4 py-2 font-black text-[9px] uppercase text-slate-400 tracking-widest whitespace-nowrap">Pago</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((g: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                <td className="px-4 py-2 text-slate-700 font-medium whitespace-nowrap max-w-[200px] truncate">{g.descripcion || g.concepto || '–'}</td>
                                <td className="px-4 py-2 text-right font-black text-slate-800 whitespace-nowrap">{parseFloat(g.monto || 0).toFixed(2)}€</td>
                                <td className="px-4 py-2 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${g.tipoPago === 'Inspector' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {g.tipoPago || 'Empresa'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {stops.length === 0 && gastos.length === 0 && (
            <div className="text-center py-12 text-slate-300">
              <ClipboardCheck size={40} className="mx-auto mb-3" />
              <p className="font-black text-sm uppercase text-slate-400">Sin datos registrados</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────── MAIN COMPONENT ──────────
export default function HistoryTab({ onStartInspection }: { onStartInspection: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('asignado');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { user } = useUser();
  const db = useFirestore();
  const isOnline = useOnlineStatus();

  const normalizeDate = (task: any): number => {
    if (task.createdAt instanceof Date) return task.createdAt.getTime();
    if (task.fecha_creacion?.toDate) return task.fecha_creacion.toDate().getTime();
    if (task.fecha_creacion?.seconds) return task.fecha_creacion.seconds * 1000;
    if (task.fecha?.toDate) return task.fecha.toDate().getTime(); // Daily reports use 'fecha'
    if (task.fecha?.seconds) return task.fecha.seconds * 1000;
    if (typeof task.fecha_creacion === 'string') return new Date(task.fecha_creacion).getTime();
    if (typeof task.fecha === 'string') return new Date(task.fecha).getTime();
    return 0;
  };

  useEffect(() => {
    if (!user || !db || !user.email) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const firestoreTaskMap = new Map<string, Task>();

        if (isOnline) {
          const qAssigned = query(collection(db, "ordenes_trabajo"), where("inspectorIds", "array-contains", user.email));
          const qCreated = query(collection(db, "ordenes_trabajo"), where("tecnicoId", "==", user.email));
          const qInformes = query(collection(db, "informes"), where("inspectorId", "==", user.email));
          const qGastos = query(collection(db, "gastos"), where("inspectorId", "==", user.email));

          const [assignedSnap, createdSnap, informesSnap, gastosSnap] = await Promise.all([
            getDocs(qAssigned),
            getDocs(qCreated),
            getDocs(qInformes),
            getDocs(qGastos)
          ]);

          assignedSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
          createdSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
          informesSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
          gastosSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true, formType: 'gastos' } as unknown as Task));
        }

        const localTasksRaw = await localDb.hojas_trabajo.toArray();
        const localTaskMap = new Map<string, Task>();
        localTasksRaw.forEach(t => {
          const taskData = { ...t.data, id: t.id!.toString(), synced: t.synced, firebaseId: t.firebaseId, createdAt: t.createdAt };
          const key = t.firebaseId || `local_${t.id}`;
          localTaskMap.set(key, taskData);
        });

        const finalTaskMap = new Map<string, Task>(localTaskMap);
        firestoreTaskMap.forEach((task, id) => { finalTaskMap.set(id, task); });

        let combinedTasks = Array.from(finalTaskMap.values());
        combinedTasks.sort((a, b) => normalizeDate(b) - normalizeDate(a));
        setTasks(combinedTasks);

      } catch (error) {
        console.error("Error al cargar el historial:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, db, isOnline]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (filter === 'asignado') {
      filtered = filtered.filter(t => t.estado === 'Pendiente' || t.estado === 'En Progreso');
    } else if (filter === 'registrado') {
      filtered = filtered.filter(t => t.estado === 'Completado' || t.estado === 'Preaprobado' || t.estado === 'Registrado');
    } else {
      filtered = filtered.filter(t => t.estado === 'Aprobado');
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.clienteNombre && t.clienteNombre.toLowerCase().includes(term)) ||
        (t.cliente && t.cliente.toLowerCase().includes(term)) ||
        t.id.toLowerCase().includes(term) ||
        (t.firebaseId && t.firebaseId.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [tasks, filter, searchTerm]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Aprobado': return 'bg-emerald-50 text-emerald-600';
      case 'Preaprobado':
      case 'Registrado':
      case 'Completado': return 'bg-blue-50 text-blue-600';
      case 'En Progreso': return 'bg-yellow-50 text-yellow-600';
      default: return 'bg-orange-50 text-orange-600';
    }
  };

  const getReportTitle = (formType: any) => {
    switch (formType) {
      case 'hoja-trabajo': return 'Hoja de Trabajo';
      case 'informe-revision': return 'Inf. Revisión';
      case 'revision-basica': return 'Rev. Básica';
      case 'informe-tecnico': return 'Inf. Técnico';
      case 'informe-simplificado': return 'Inf. Simplificado';
      case 'gastos': return 'Bitácora';
      case 'job': return 'Trabajo';
      default: return 'Documento';
    }
  };

  const TABS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
    { key: 'asignado', label: 'Asignado', icon: <MapPin size={12} /> },
    { key: 'registrado', label: 'Registrado', icon: <ClipboardCheck size={12} /> },
    { key: 'aprobado', label: 'Aprobado', icon: <Star size={12} /> },
  ];

  return (
    <>
      {selectedTask && (
        <ReportDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 w-full max-w-4xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Bandeja de Trabajos</h2>
          <div className="w-full md:w-auto flex items-center gap-1 bg-slate-200 p-1 rounded-full">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex-1 justify-center ${filter === tab.key
                    ? 'bg-slate-900 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar por cliente o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-6 pl-12 rounded-2xl bg-white shadow-sm border-slate-100 text-lg font-bold"
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex justify-center items-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const displayId = task.firebaseId || task.id || `Borrador`;
              const stops = task.itinerario || [];
              const totalHrs = stops.reduce((s: number, p: any) => s + (p.horasNormales || 0) + (p.horasExtras || 0) + (p.horasEspeciales || 0), 0);
              const totalGastos = (task.gastos || []).reduce((s: number, g: any) => s + (parseFloat(g.monto) || 0), 0);

              return (
                <button
                  key={task.id}
                  onClick={() => {
                    if (filter === 'asignado') {
                      onStartInspection(task);
                    } else {
                      setSelectedTask(task);
                    }
                  }}
                  className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all text-left hover:shadow-md"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase ${task.synced ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        {displayId.length > 20 ? `...${displayId.slice(-12)}` : displayId}
                      </span>
                      {task.estado && (
                        <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase ${getEstadoBadge(task.estado)}`}>
                          {task.estado}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase truncate">
                      {getReportTitle(task.formType)}: {task.clienteNombre || task.cliente || 'Cliente Varios'}
                    </h3>

                    {/* Mini stats */}
                    {filter !== 'asignado' && (totalHrs > 0 || totalGastos > 0) && (
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                        {totalHrs > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-emerald-500" />
                            {decimalToTime(totalHrs)}
                          </span>
                        )}
                        {totalGastos > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-blue-500" />
                            {totalGastos.toFixed(2)}€
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner flex-shrink-0 ml-4
                    ${filter === 'aprobado'
                      ? 'bg-emerald-50 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                      : filter === 'registrado'
                        ? 'bg-blue-50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
                        : 'bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white'}`}>
                    <ArrowRight size={20} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                <Search size={32} />
              </div>
              <div>
                <p className="text-slate-900 font-black uppercase text-sm tracking-widest">Sin resultados</p>
                <p className="text-slate-400 text-[10px] font-bold leading-relaxed px-4 mt-1 uppercase tracking-widest">
                  {searchTerm ? 'Prueba con otro término.' : `No hay trabajos en estado "${filter}".`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
