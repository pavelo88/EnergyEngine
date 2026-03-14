'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Users, Briefcase, Clock, Loader2, TrendingUp, Activity, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { useAdminHeader } from './components/AdminHeaderContext';

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ElementType;
  className?: string;
  accentColor: string;
  loading: boolean;
};

const StatCard = ({ title, value, icon: Icon, className = "", accentColor, loading }: StatCardProps) => (
  <div className={`group relative overflow-hidden bg-white/70 backdrop-blur-2xl border border-white/40 p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:bg-white/90 ${className}`}>
    <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-10">
            <div className={`p-4 rounded-3xl ${accentColor} text-white shadow-2xl shadow-current/20 group-hover:scale-110 transition-transform duration-500`}>
                <Icon size={28} />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 duration-500">
                <ArrowUpRight className="text-slate-400" size={24} />
            </div>
        </div>
        <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 leading-none">{title}</p>
            {loading ? (
                <div className="flex items-baseline gap-2">
                    <div className="h-12 w-32 bg-slate-100 animate-pulse rounded-xl"></div>
                </div>
            ) : (
                <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-slate-900 tracking-tighter font-headline leading-none">{value}</span>
                    <span className="text-primary font-black text-xl">+</span>
                </div>
            )}
        </div>
    </div>
    {/* Decorative internal glow */}
    <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity duration-700 ${accentColor.split(' ')[0]}`}></div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ clients: 0, pendingJobs: 0, inProgressJobs: 0, inspectors: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  const headerAction = useMemo(() => (
    <div className="flex items-center gap-3 px-6 py-2 bg-white/50 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm">
        <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sistema Activo</span>
    </div>
  ), []);

  useAdminHeader('Engineering Terminal', headerAction);

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }

    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    });

    const qInspectors = query(collection(db, 'usuarios'), where("roles", "array-contains", "inspector"));
    const unsubInspectors = onSnapshot(qInspectors, snapshot => {
        setStats(prev => ({ ...prev, inspectors: snapshot.size }));
    });

    const qJobs = query(collection(db, 'trabajos'), orderBy('fecha_creacion', 'desc'));
    const unsubJobs = onSnapshot(qJobs, snapshot => {
      let pending = 0;
      let inProgress = 0;
      const jobs: Job[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.estado === 'Pendiente') pending++;
        if (data.estado === 'En Progreso') inProgress++;
        
        if (jobs.length < 5) {
            jobs.push({ id: doc.id, ...data } as Job); 
        }
      });

      setStats(prev => ({ ...prev, pendingJobs: pending, inProgressJobs: inProgress }));
      setRecentJobs(jobs);
      if (loading) setLoading(false);
    });

    return () => {
      unsubClients();
      unsubInspectors();
      unsubJobs();
    };
  }, [db, loading]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      
      {/* Bento Grid layout para estadísticas - Más agresivo */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-8">
        
        <StatCard 
            className="md:col-span-3 md:row-span-2 min-h-[400px]"
            title="Clientes en Plataforma" 
            value={stats.clients} 
            icon={Users} 
            accentColor="bg-blue-600 shadow-blue-200" 
            loading={loading} 
        />
        
        <StatCard 
            className="md:col-span-3"
            title="Inspectores Activos" 
            value={stats.inspectors} 
            icon={ShieldCheck} 
            accentColor="bg-emerald-500 shadow-emerald-200" 
            loading={loading} 
        />

        <StatCard 
            className="md:col-span-3 lg:col-span-1"
            title="Pdtes" 
            value={stats.pendingJobs} 
            icon={Clock} 
            accentColor="bg-amber-500 shadow-amber-200" 
            loading={loading} 
        />
        
        <StatCard 
            className="md:col-span-3 lg:col-span-2"
            title="Proyectos en Curso" 
            value={stats.inProgressJobs} 
            icon={Briefcase} 
            accentColor="bg-indigo-600 shadow-indigo-200" 
            loading={loading} 
        />
      </div>

      {/* Monitor de Actividad con diseño tipo Vidrio */}
      <div className="bg-white/40 backdrop-blur-3xl border border-white/60 p-12 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.03)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Zap size={200} className="text-primary" strokeWidth={1} />
            </div>
            
            <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter font-headline leading-tight">Actividad de Campo</h2>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronización en Tiempo Real</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto relative z-10">
            {loading ? <div className="h-60 flex items-center justify-center"><Loader2 className="animate-spin text-primary/40" size={60}/></div> : (
                <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                    <tr className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
                      <th className="pb-6 pl-8">Entidad</th>
                      <th className="pb-6 px-4 text-center">Equipo Técnico</th>
                      <th className="pb-6 pr-8 text-right">Estatus</th>
                    </tr>
                </thead>
                <tbody>
                    {recentJobs.length > 0 ? (
                    recentJobs.map(job => (
                        <tr key={job.id} className="group hover:scale-[1.01] transition-all duration-500">
                            <td className="bg-white/80 backdrop-blur-md py-8 pl-8 first:rounded-l-[2.5rem] last:rounded-r-[2.5rem] border-y border-l border-white/20">
                                <div className="font-black text-slate-900 uppercase tracking-tight text-lg group-hover:text-primary transition-colors">
                                    {job.clienteNombre}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                    ID: {job.id.substring(0, 12)}
                                </div>
                            </td>
                            <td className="bg-white/80 backdrop-blur-md py-8 px-4 border-y border-white/10">
                                <div className="flex justify-center items-center gap-2 flex-wrap">
                                    {job.inspectorNombres?.map(name => (
                                        <span key={name} className="px-4 py-1.5 bg-slate-900 text-[10px] font-black text-white rounded-full uppercase tracking-tighter shadow-lg shadow-slate-900/10">{name}</span>
                                    )) || <span className="text-xs italic text-slate-400">Sin personal asignado</span>}
                                </div>
                            </td>
                            <td className="bg-white/80 backdrop-blur-md py-8 pr-8 text-right first:rounded-l-[2.5rem] last:rounded-r-[2.5rem] border-y border-r border-white/20">
                                <span className={`inline-flex items-center gap-3 px-6 py-2.5 text-[11px] font-black rounded-full uppercase tracking-widest border shadow-sm
                                ${job.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-amber-100/20' : ''}
                                ${job.estado === 'En Progreso' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/20' : ''}
                                ${job.estado === 'Completado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20' : ''}`}>
                                    <div className={`w-2 h-2 rounded-full animate-pulse
                                        ${job.estado === 'Pendiente' ? 'bg-amber-500' : ''}
                                        ${job.estado === 'En Progreso' ? 'bg-blue-500' : ''}
                                        ${job.estado === 'Completado' ? 'bg-emerald-500' : ''}
                                    `}></div>
                                    {job.estado}
                                </span>
                            </td>
                        </tr>
                    ))
                    ) : (
                    <tr><td colSpan={3} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-30">
                            <Clock size={48} className="text-slate-300" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-[0.5em]">No hay actividad en el radar.</p>
                        </div>
                    </td></tr>
                    )}
                </tbody>
                </table>
            )}
            </div>
        </div>
    </div>
  );
}

type Job = { 
  id: string; 
  clienteNombre: string; 
  estado: string; 
  inspectorNombres: string[]; 
};