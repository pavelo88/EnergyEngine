'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Clock, Loader2, ArrowRight, CheckCircle2 as SyncedIcon, MapPin
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { db as localDb } from '@/lib/db-local';

interface Task {
  id: string;
  clienteNombre?: string;
  cliente?: string;
  instalacion: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  fecha_creacion?: any;
  firebaseId?: string;
  synced?: boolean;
  createdAt?: Date;
  [key: string]: any;
}

export default function HistoryTab({ onStartInspection }: { onStartInspection: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useUser();
  const db = useFirestore();
  const isOnline = useOnlineStatus();

  // Función de normalización de fechas para asegurar un ordenamiento impecable
  const normalizeDate = (task: any): number => {
    if (task.createdAt instanceof Date) return task.createdAt.getTime();
    if (task.fecha_creacion?.toDate) return task.fecha_creacion.toDate().getTime();
    if (task.fecha_creacion?.seconds) return task.fecha_creacion.seconds * 1000;
    if (typeof task.fecha_creacion === 'string') return new Date(task.fecha_creacion).getTime();
    return 0;
  };

  useEffect(() => {
    if (!user || !db || !user.email) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const firestoreTaskMap = new Map<string, Task>();
        
        // 1. Fetch de la nube si hay red
        if (isOnline) {
          const qAssigned = query(collection(db, "ordenes_trabajo"), where("inspectorIds", "array-contains", user.email));
          const qCreated = query(collection(db, "ordenes_trabajo"), where("tecnicoId", "==", user.email));
          const qInformes = query(collection(db, "informes"), where("inspectorId", "==", user.email));
          
          const [assignedSnap, createdSnap, informesSnap] = await Promise.all([
            getDocs(qAssigned), 
            getDocs(qCreated),
            getDocs(qInformes)
          ]);
          
          assignedSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
          createdSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
          informesSnap.docs.forEach(doc => firestoreTaskMap.set(doc.id, { ...doc.data(), id: doc.id, synced: true } as Task));
        }

        // 2. Fetch de la DB local (Dexie)
        const localTasksRaw = await localDb.hojas_trabajo.toArray();
        const localTaskMap = new Map<string, Task>();
        localTasksRaw.forEach(t => {
          const taskData = { ...t.data, id: t.id!.toString(), synced: t.synced, firebaseId: t.firebaseId, createdAt: t.createdAt };
          const key = t.firebaseId || `local_${t.id}`;
          localTaskMap.set(key, taskData);
        });

        // 3. Mezclado: Datos locales mandan si no están sincronizados, la nube manda si existe el ID
        const finalTaskMap = new Map<string, Task>(localTaskMap);
        firestoreTaskMap.forEach((task, id) => {
          finalTaskMap.set(id, task);
        });
        
        let combinedTasks = Array.from(finalTaskMap.values());
        
        // 4. Ordenamiento cronológico impecable usando milisegundos
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

    if (filter === 'pending') {
      filtered = filtered.filter(t => t.estado === 'Pendiente' || t.estado === 'En Progreso');
    } else {
      filtered = filtered.filter(t => t.estado === 'Completado');
    }

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(t => 
            (t.clienteNombre && t.clienteNombre.toLowerCase().includes(lowercasedTerm)) ||
            (t.cliente && t.cliente.toLowerCase().includes(lowercasedTerm)) ||
            (t.instalacion && t.instalacion.toLowerCase().includes(lowercasedTerm)) ||
            t.id.toLowerCase().includes(lowercasedTerm) ||
            (t.firebaseId && t.firebaseId.toLowerCase().includes(lowercasedTerm))
        );
    }

    return filtered;
  }, [tasks, filter, searchTerm]);

  const getReportTitle = (formType: any) => {
    switch(formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'revision-basica': return 'Revisión Básica';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        case 'job': return 'Trabajo Manual';
        default: return 'Documento';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 w-full max-w-4xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Bandeja de Trabajos</h2>
        <div className="w-full md:w-auto flex items-center gap-2 bg-slate-200 p-1 rounded-full">
            <Button onClick={() => setFilter('pending')} variant={filter === 'pending' ? 'default' : 'ghost'} className="rounded-full px-4 py-1 h-auto text-[10px] font-black uppercase flex-1 tracking-widest">Pendientes</Button>
            <Button onClick={() => setFilter('completed')} variant={filter === 'completed' ? 'default' : 'ghost'} className="rounded-full px-4 py-1 h-auto text-[10px] font-black uppercase flex-1 tracking-widest">Finalizados</Button>
        </div>
      </div>
      
      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            type="text"
            placeholder="Buscar por cliente, sede o ID de informe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-6 pl-12 rounded-2xl bg-white shadow-sm border-slate-100 text-lg font-bold"
          />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center items-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const displayId = task.firebaseId || task.id || `Borrador #${task.id}`;
            return (
              <button 
                key={task.id}
                onClick={() => onStartInspection(task)}
                disabled={filter === 'completed'}
                className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase
                      ${task.synced ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {displayId}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {task.synced 
                        ? <SyncedIcon size={12} className="text-green-500"/> 
                        : <Clock size={10} className="text-orange-500"/>}
                      {task.synced ? 'Sincronizado' : 'Solo Local'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">
                    {getReportTitle(task.formType)}: {task.clienteNombre || task.cliente || 'Cliente Varios'}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={14} className="text-primary/70" />
                    <span className="text-xs font-bold uppercase tracking-widest">{task.instalacion || 'Sin Ubicación'}</span>
                  </div>
                </div>

                {filter === 'pending' && (
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-slate-300 shadow-inner">
                    <ArrowRight size={20} />
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4 shadow-inner">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
              <Search size={32} />
            </div>
            <div>
              <p className="text-slate-900 font-black uppercase text-sm tracking-widest">
                Sin resultados
              </p>
              <p className="text-slate-400 text-[10px] font-bold leading-relaxed px-4 mt-1 uppercase tracking-widest">
                {searchTerm ? 'Prueba con otro t¿rmino de b¿squeda.' : `No hay informes registrados en esta secci¿n.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
