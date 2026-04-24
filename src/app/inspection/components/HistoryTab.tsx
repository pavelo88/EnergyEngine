'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Clock, Loader2, ArrowRight, MapPin,
  X, TrendingUp, ClipboardCheck, Star, User, Info, FileText, Settings, Wrench, ChevronRight, Phone, Mail, Calendar, ClipboardList
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { resolveInspectorEmail } from '@/lib/inspection-mode';

import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as localDb } from '@/lib/db-local';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { decimalToTime, formatSafeDate } from '@/lib/utils';

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

// ────────── OT DETAIL MODAL (LA FICHA DE LA OT) ──────────
function OTDetailModal({ ot, reports, onClose, onStartAction }: { 
  ot: Task; 
  reports: Task[]; 
  onClose: () => void;
  onStartAction: (type: string, ot: Task) => void;
}) {
  const getEstadoColor = (estado: string) => {
    if (estado === 'Aprobado') return 'bg-emerald-500 text-white';
    if (estado === 'Registrado' || estado === 'Abierta' || estado === 'En Progreso') return 'bg-blue-500 text-white';
    return 'bg-orange-400 text-white';
  };

  const actionButtons = [
    { id: 'hoja-trabajo', label: 'Hoja de Trabajo', icon: FileText, color: 'bg-emerald-500' },
    { id: 'informe-tecnico', label: 'Informe Técnico', icon: Settings, color: 'bg-blue-500' },
    { id: 'informe-revision', label: 'Informe de Revisión', icon: ClipboardCheck, color: 'bg-amber-500' },
    { id: 'informe-simplificado', label: 'Informe Simplificado', icon: Wrench, color: 'bg-slate-700' },
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl bg-slate-50 rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header con ID y Estado */}
        <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <ClipboardList size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                {ot.id} - {ot.descripcion}
              </DialogTitle>
              <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase ${getEstadoColor(ot.estado)}`}>
                {ot.estado}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scroll">
          {/* Grid de Información */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Info General */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Info size={12} className="text-primary" /> Información General
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User size={14} className="text-slate-300 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Cliente</p>
                    <p className="text-xs font-bold text-slate-800">{ot.clienteNombre || ot.cliente || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} /> {formatSafeDate(ot.fecha_creacion || ot.fecha, 'dd/MM/yyyy')}
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={14} className="text-slate-300 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Teléfono</p>
                    <p className="text-xs font-bold text-slate-800">{ot.telefono || 'No registrado'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={14} className="text-slate-300 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Email</p>
                    <p className="text-xs font-bold text-slate-800 lowercase">{ot.email || 'No registrado'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} className="text-primary" /> Ubicación
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Dirección</p>
                  <p className="text-xs font-bold text-slate-800">{ot.instalacion || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Ciudad / País</p>
                  <p className="text-xs font-bold text-slate-800">{ot.ciudad || 'Madrid'}, {ot.pais || 'España'}</p>
                </div>
              </div>
            </div>

            {/* Detalles OT */}
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings size={12} className="text-primary" /> Detalles de la OT
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Fecha Creación</p>
                  <p className="text-xs font-bold text-slate-800">{formatSafeDate(ot.fecha_creacion, 'dd/MM/yyyy')}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Prioridad</p>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${ot.prioridad === 'Alta' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {ot.prioridad || 'Media'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Técnicos Asignados */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User size={12} className="text-primary" /> Técnicos Asignados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(ot.tecnicoNombres || [ot.tecnicoNombre]).map((nombre: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black uppercase">
                    {nombre ? nombre.charAt(0) : 'T'}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-800">{nombre || 'Técnico Energy'}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Especialista</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACCIONES RÁPIDAS (Botones de Informes) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {actionButtons.map(action => (
              <button
                key={action.id}
                onClick={() => onStartAction(action.id, ot)}
                className="flex flex-col items-center justify-center gap-3 p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-primary hover:shadow-xl transition-all group active:scale-95"
              >
                <div className={`w-12 h-12 ${action.color} text-white rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110`}>
                  <action.icon size={20} />
                </div>
                <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter text-center">{action.label}</p>
              </button>
            ))}
          </div>

          {/* Partes de Trabajo Realizados */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4 overflow-hidden">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck size={12} className="text-primary" /> Partes de Trabajo Realizados
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">Nº Parte</th>
                    <th className="px-4 py-3">Técnico</th>
                    <th className="px-4 py-3 text-center">Fecha</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {reports.map((report, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-[10px] font-black text-slate-900">{report.numero_informe || report.id}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{report.inspectorNombre || report.tecnicoNombre || '—'}</td>
                      <td className="px-4 py-3 text-center text-[10px] text-slate-500 font-bold">{formatSafeDate(report.fecha || report.fecha_creacion, 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 max-w-[150px] truncate">{report.formType || 'Informe'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${report.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {report.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[10px] font-black text-slate-300 uppercase">No se han registrado partes para esta OT</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────── LEGACY/HOURS DETAIL MODAL ──────────
function LegacyDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const isBitacora = task.type === 'bitacora' || task.formType === 'bitacora';
  const isGasto = task.type === 'gasto' || task.formType === 'gastos';

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-slate-50 rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
        <div className="bg-white p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
            {isBitacora ? <Clock size={24} /> : <TrendingUp size={24} />}
          </div>
          <div>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              {isBitacora ? 'Detalle de Horas' : 'Detalle de Gastos'}
            </DialogTitle>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {task.fechaStr || formatSafeDate(task.fecha || task.fecha_creacion, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isBitacora ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase">Cliente</span>
                <span className="font-bold text-slate-800 uppercase">{task.clienteNombre || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Llegada</p>
                  <p className="font-black text-slate-900">{task.horaLlegada || '--:--'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Salida</p>
                  <p className="font-black text-slate-900">{task.horaSalida || '--:--'}</p>
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase">Total Horas</p>
                <p className="text-xl font-black text-emerald-700">{task.hNormalesStr || '0.00'}h</p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Concepto</span>
                <span className="font-bold text-slate-800 uppercase">{task.rubro || 'N/A'}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">{task.descripcion || 'Sin descripción'}</p>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase">Monto</p>
                <p className="text-xl font-black text-blue-700">{task.monto ? task.monto.toFixed(2) : '0.00'}€</p>
              </div>
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
  const currentEmail = resolveInspectorEmail(user?.email || '');

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
          const email = resolveInspectorEmail(user.email);
          const qAssigned = query(collection(db, "ordenes_trabajo"), where("inspectorIds", "array-contains", email));
          const qCreated = query(collection(db, "ordenes_trabajo"), where("tecnicoId", "==", email));
          const qInformes = query(collection(db, "informes"), where("inspectorId", "==", email));
          const [assignedSnap, createdSnap, informesSnap] = await Promise.all([
            getDocs(qAssigned),
            getDocs(qCreated),
            getDocs(qInformes)
          ]);

          assignedSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true, type: 'ot', estado: doc.data().estado || 'Asignado' } as Task));
          createdSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true, type: 'ot', estado: doc.data().estado || 'Asignado' } as Task));
          informesSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true, type: 'informe', estado: doc.data().estado || 'Registrado' } as Task));
        }

        const localTasksRaw = await localDb.hojas_trabajo.toArray();
        const localTaskMap = new Map<string, Task>();
        localTasksRaw.forEach(t => {
          // Filtrar por inspector si no es admin (aunque en HistoryTab siempre es perfil técnico)
          const itemInspector = t.data.inspectorId || t.data.tecnicoId;
          if (itemInspector && itemInspector !== currentEmail) return;

          const taskData = { 
            ...t.data, 
            id: t.id!.toString(), 
            synced: t.synced, 
            firebaseId: t.firebaseId, 
            createdAt: t.createdAt,
            type: t.data.type || 'informe' // Forzar tipo informe si es de hojas_trabajo
          };
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
    let filtered = [...tasks];

    if (filter === 'asignado') {
      // Solo OTs en la pestaña de asignados
      filtered = filtered.filter(t => t.type === 'ot' && (t.estado === 'Asignado' || t.estado === 'Abierta' || t.estado === 'Registrada'));
    } else if (filter === 'registrado') {
      // Solo informes en la pestaña de registrados
      filtered = filtered.filter(t => t.type === 'informe' && (t.estado === 'Registrado' || t.estado === 'Registrada' || t.estado === 'En Progreso'));
    } else {
      // Solo informes en la pestaña de aprobados
      filtered = filtered.filter(t => t.type === 'informe' && (t.estado === 'Aprobado' || t.estado === 'Cerrada'));
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.clienteNombre && t.clienteNombre.toLowerCase().includes(term)) ||
        (t.cliente && t.cliente.toLowerCase().includes(term)) ||
        t.id.toLowerCase().includes(term) ||
        (t.firebaseId && t.firebaseId.toLowerCase().includes(term)) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [tasks, filter, searchTerm]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Aprobado': return 'bg-emerald-50 text-emerald-600';
      case 'Registrado': return 'bg-blue-50 text-blue-600';
      case 'Asignado': return 'bg-orange-50 text-orange-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getReportTitle = (formType: any) => {
    switch (formType) {
      case 'hoja-trabajo': return 'Hoja de Trabajo';
      case 'informe-revision': return 'Inf. Revisión';
      case 'revision-basica': return 'Rev. Básica';
      case 'informe-tecnico': return 'Inf. Técnico';
      case 'informe-simplificado': return 'Inf. Simplificado';
      case 'gastos': return 'Gasto';
      case 'bitacora': return 'Horas / Visita';
      case 'job': return 'Orden de Trabajo';
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
      {selectedTask && selectedTask.type === 'ot' ? (
        <OTDetailModal 
          ot={selectedTask} 
          reports={tasks.filter(t => t.orderId === selectedTask.id && (t.inspectorId === currentEmail || t.tecnicoId === currentEmail))}
          onClose={() => setSelectedTask(null)} 
          onStartAction={(type, ot) => {
            onStartInspection({ ...ot, formType: type, orderId: ot.id, originalJobId: ot.id });
            setSelectedTask(null);
          }}
        />
      ) : selectedTask && selectedTask.type === 'informe' ? null : selectedTask && (
        <LegacyDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
        />
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
                    if (task.type === 'informe') {
                      onStartInspection(task);
                    } else {
                      setSelectedTask(task);
                    }
                  }}
                  className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all text-left hover:shadow-md"
                >
                  <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors
                      ${task.type === 'ot' ? 'bg-primary/10 text-primary' : 
                        task.type === 'bitacora' ? 'bg-emerald-100 text-emerald-600' :
                        task.type === 'gasto' ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-400'}`}>
                      {task.type === 'ot' ? <ClipboardList size={28} /> : 
                       task.type === 'bitacora' ? <Clock size={28} /> :
                       task.type === 'gasto' ? <TrendingUp size={28} /> :
                       <FileText size={28} />}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase ${task.type === 'ot' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                          {task.id}
                        </span>
                        {task.estado && (
                          <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase ${getEstadoBadge(task.estado)}`}>
                            {task.estado}
                          </span>
                        )}
                        {task.prioridad === 'Alta' && (
                          <span className="px-3 py-1 text-[9px] font-black rounded-full uppercase bg-red-50 text-red-600">Alta Prioridad</span>
                        )}
                      </div>

                      {task.type === 'ot' ? (
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-primary tracking-tight leading-none uppercase truncate">
                            {task.clienteNombre || task.cliente || 'CLIENTE'}
                          </h3>
                          <p className="text-sm font-bold text-slate-600 uppercase truncate">
                            {task.descripcion || 'Sin título'}
                          </p>
                          <div className="flex flex-col gap-1 mt-2">
                            {(task.direccion || task.ciudad) && (
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <MapPin size={10} className="text-primary/40" />
                                <span className="text-[9px] font-black uppercase truncate">
                                  {task.direccion}{task.ciudad ? ` • ${task.ciudad}` : ''}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Calendar size={10} />
                              <span className="text-[8px] font-black uppercase">
                                Asignación: {formatSafeDate(task.fecha_creacion || task.fecha, 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase truncate">
                            {getReportTitle(task.formType)}
                          </h3>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase">
                            <div className="flex items-center gap-1.5">
                              <User size={12} /> {task.clienteNombre || task.cliente || 'Cliente Varios'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} /> {formatSafeDate(task.fecha_creacion || task.fecha, 'dd/MM/yyyy')}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-inner flex-shrink-0 ml-4
                    ${filter === 'aprobado'
                      ? 'bg-emerald-50 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                      : filter === 'registrado'
                        ? 'bg-blue-50 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
                        : 'bg-slate-50 text-slate-300 group-hover:bg-primary group-hover:text-white'}`}>
                    <ChevronRight size={20} />
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
