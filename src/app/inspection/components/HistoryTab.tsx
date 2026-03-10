'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, MapPin, Search, Filter, Clock, CheckCircle2, Loader2, ArrowRight
} from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Task {
  id: string;
  clienteNombre?: string;
  cliente?: string;
  instalacion: string;
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  fecha_creacion?: any;
  [key: string]: any;
}

export default function HistoryTab({ onStartInspection }: { onStartInspection: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    if (!user || !db) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const q1 = query(
          collection(db, "trabajos"),
          where("inspectorIds", "array-contains", user.uid)
        );

        const q2 = query(
          collection(db, "trabajos"),
          where("tecnicoId", "==", user.uid)
        );

        const [assignedSnapshot, createdSnapshot] = await Promise.all([
          getDocs(q1),
          getDocs(q2),
        ]);

        const assignedTasks = assignedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];
        const createdTasks = createdSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Task[];

        const allTasks = [...assignedTasks, ...createdTasks];
        const uniqueTasks = Array.from(new Map(allTasks.map(task => [task.id, task])).values());
        
        uniqueTasks.sort((a, b) => {
          const dateA = a.fecha_creacion?.toDate() || 0;
          const dateB = b.fecha_creacion?.toDate() || 0;
          return dateB - dateA;
        });

        setTasks(uniqueTasks);

      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, db]);

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
            t.id.toLowerCase().includes(lowercasedTerm)
        );
    }

    return filtered;
  }, [tasks, filter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 w-full max-w-4xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-3xl font-black text-slate-800">Mis Trabajos</h2>
        <div className="w-full md:w-auto flex items-center gap-2 bg-slate-200 p-1 rounded-full">
            <Button onClick={() => setFilter('pending')} variant={filter === 'pending' ? 'default' : 'ghost'} className="rounded-full px-4 py-1 h-auto text-sm font-bold flex-1">Pendientes</Button>
            <Button onClick={() => setFilter('completed')} variant={filter === 'completed' ? 'default' : 'ghost'} className="rounded-full px-4 py-1 h-auto text-sm font-bold flex-1">Completados</Button>
        </div>
      </div>
      
      <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input 
            type="text"
            placeholder="Buscar por cliente, instalación o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-6 pl-12 rounded-2xl bg-white shadow-sm border-slate-100 text-lg font-bold"
          />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center items-center"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <button 
              key={task.id}
              onClick={() => onStartInspection(task)}
              disabled={filter === 'completed'}
              className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-[9px] font-black rounded-full uppercase
                    ${task.estado === 'Completado' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                    {task.id}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    {task.estado === 'Completado' ? <CheckCircle2 size={12} className="text-green-500"/> : <Clock size={10} />}
                    {task.estado}
                  </span>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  {task.clienteNombre || task.cliente || 'Cliente no asignado'}
                </h3>
                
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={14} className="text-primary/70" />
                  <span className="text-xs font-medium">{task.instalacion || 'Ubicación no especificada'}</span>
                </div>
              </div>

              {filter === 'pending' && (
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-slate-300">
                  <ArrowRight size={20} />
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
              <Search size={32} />
            </div>
            <div>
              <p className="text-slate-900 font-black uppercase text-sm">
                No se encontraron trabajos
              </p>
              <p className="text-slate-400 text-xs font-bold leading-relaxed px-4 mt-1">
                {searchTerm ? 'Prueba con otro término de búsqueda.' : `No tienes trabajos ${filter === 'pending' ? 'pendientes' : 'completados'}.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

    