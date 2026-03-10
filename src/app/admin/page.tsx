'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Users, Briefcase, Clock, Loader2, TrendingUp } from 'lucide-react';
import { useAdminHeader } from './components/AdminHeaderContext';

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  loading: boolean;
};
type Job = { id: string; clienteNombre: string; estado: string; inspectorNombres: string[]; };

const StatCard = ({ title, value, icon: Icon, color, loading }: StatCardProps) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      {loading ? (
        <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
      ) : (
        <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
      )}
    </div>
    <div className={`rounded-2xl p-4 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ clients: 0, pendingJobs: 0, inProgressJobs: 0, inspectors: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  // Seteamos el título del Header Global
  useAdminHeader('Panel de Control', <TrendingUp className="text-primary h-6 w-6" />);

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Clientes Registrados" value={stats.clients} icon={Users} color="bg-blue-500" loading={loading} />
        <StatCard title="Trabajos Pendientes" value={stats.pendingJobs} icon={Clock} color="bg-amber-500" loading={loading} />
        <StatCard title="En Progreso" value={stats.inProgressJobs} icon={Briefcase} color="bg-indigo-500" loading={loading} />
        <StatCard title="Inspectores Activos" value={stats.inspectors} icon={Users} color="bg-emerald-500" loading={loading} />
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Actividad Reciente en Terreno</h2>
            <div className="overflow-x-auto">
            {loading ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-primary"/></div> : (
                <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="pb-4">Cliente</th>
                      <th className="pb-4">Inspectores</th>
                      <th className="pb-4">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {recentJobs.length > 0 ? (
                    recentJobs.map(job => (
                        <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 font-bold text-slate-700">{job.clienteNombre}</td>
                        <td className="py-4 text-sm text-slate-500 font-medium">{job.inspectorNombres?.join(', ') || 'Sin asignar'}</td>
                        <td className="py-4">
                            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                            ${job.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600' : ''}
                            ${job.estado === 'En Progreso' ? 'bg-indigo-50 text-indigo-600' : ''}
                            ${job.estado === 'Completado' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
                            {job.estado}
                            </span>
                        </td>
                        </tr>
                    ))
                    ) : (
                    <tr><td colSpan={3} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No se registra actividad reciente.</td></tr>
                    )}
                </tbody>
                </table>
            )}
            </div>
        </div>
    </div>
  );
}
