'use client';

import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, MapPin, Calendar, ArrowRight, 
  Search, Filter, Clock, CheckCircle2 
} from 'lucide-react';
import { useFirestore, useAuth } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface Task {
  id: string;
  cliente: { nombre: string; instalacion: string };
  equipo: { modelo: string; marca: string };
  estado: string;
  fecha_asignacion?: any;
}

export default function TasksTab({ onStartInspection }: { onStartInspection: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const db = useFirestore();
  const auth = useAuth();

  // --- ESCUCHAR TAREAS ASIGNADAS EN TIEMPO REAL ---
  useEffect(() => {
    if (!auth?.currentUser || !db) return;

    // Buscamos intervenciones con estado 'asignada'
    // Nota: En una fase más avanzada, filtraríamos por id_inspector
    const q = query(
      collection(db, "trabajos"),
      where("estado", "==", "asignada")
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const tasksData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      
      setTasks(tasksData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const filteredTasks = tasks.filter(t => 
    (t.cliente?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.equipo?.modelo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
      
      {/* BARRA DE BÚSQUEDA */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar por cliente o motor..."
          className="w-full p-5 pl-12 bg-white rounded-3xl border-none shadow-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE TAREAS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tareas Asignadas ({filteredTasks.length})</h2>
          <Filter size={14} className="text-slate-400" />
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando Tareas...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <button 
              key={task.id}
              onClick={() => onStartInspection(task)}
              className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group active:scale-[0.98] transition-all text-left"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full uppercase">
                    {task.equipo?.marca || 'Motor'} {task.equipo?.modelo || ''}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                    <Clock size={10} /> Pendiente
                  </span>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  {task.cliente?.nombre || 'Cliente no asignado'}
                </h3>
                
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin size={14} className="text-emerald-500" />
                  <span className="text-xs font-medium">{task.cliente?.instalacion || 'Ubicación no especificada'}</span>
                </div>
              </div>

              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors text-slate-300">
                <ArrowRight size={20} />
              </div>
            </button>
          ))
        ) : (
          <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
              <ClipboardList size={32} />
            </div>
            <div>
              <p className="text-slate-900 font-black uppercase text-sm">Sin tareas hoy</p>
              <p className="text-slate-400 text-[10px] font-bold leading-relaxed px-4">
                No tienes intervenciones asignadas. <br/>Disfruta de tu descanso o contacta al Admin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ESTADÍSTICA RÁPIDA */}
      {filteredTasks.length > 0 && (
        <div className="bg-slate-900 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progreso Diario</p>
              <p className="text-sm font-black">0 / {tasks.length} Completadas</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-2xl font-black text-emerald-400">0%</div>
          </div>
        </div>
      )}
    </div>
  );
}