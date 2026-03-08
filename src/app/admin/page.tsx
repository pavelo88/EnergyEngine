'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Users, Briefcase, Clock } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
};
type Job = { id: string; clienteNombre: string; estado: string; inspectorNombres: string[]; };

const StatCard = ({ title, value, icon: Icon, color }: StatCardProps) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm flex items-center justify-between`}>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
    </div>
    <div className={`rounded-full p-3 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ clients: 0, pendingJobs: 0, inProgressJobs: 0, inspectors: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }

    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    });

    const qInspectors = query(collection(db, 'usuarios'), where("rol", "==", "inspector"));
    const unsubInspectors = onSnapshot(qInspectors, snapshot => {
        setStats(prev => ({ ...prev, inspectors: snapshot.size }));
    });

    const qJobs = query(collection(db, 'trabajos'), orderBy('fechaCreacion', 'desc'));
    const unsubJobs = onSnapshot(qJobs, snapshot => {
      let pending = 0;
      let inProgress = 0;
      const jobs: Job[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data(); // <-- Le quitamos el "as Job" aquí
        if (data.estado === 'Pendiente') pending++;
        if (data.estado === 'En Progreso') inProgress++;
        
        if (jobs.length < 5) {
            // Unimos el ID y los datos, y AHORA le decimos que es un Job
            jobs.push({ id: doc.id, ...data } as Job); 
        }
      });

      setStats(prev => ({ ...prev, pendingJobs: pending, inProgressJobs: inProgress }));
      setRecentJobs(jobs);
      setLoading(false);
    });

    return () => {
      unsubClients();
      unsubInspectors();
      unsubJobs();
    };
  }, [db]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
          <div>
              <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-slate-500 mt-1">Un resumen de la actividad reciente.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Clientes Totales" value={stats.clients} icon={Users} color="bg-blue-500" />
        <StatCard title="Trabajos Pendientes" value={stats.pendingJobs} icon={Clock} color="bg-yellow-500" />
        <StatCard title="Trabajos En Progreso" value={stats.inProgressJobs} icon={Briefcase} color="bg-indigo-500" />
        <StatCard title="Inspectores Activos" value={stats.inspectors} icon={Users} color="bg-green-500" />
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Trabajos Recientes</h2>
            <div className="overflow-x-auto">
            {loading ? <p>Cargando...</p> : (
                <table className="w-full text-left">
                <thead>
                    <tr className="border-b"><th className="p-3">Cliente</th><th className="p-3">Inspectores</th><th className="p-3">Estado</th></tr>
                </thead>
                <tbody>
                    {recentJobs.length > 0 ? (
                    recentJobs.map(job => (
                        <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{job.clienteNombre}</td>
                        <td className="p-3">{job.inspectorNombres?.join(', ') || 'Sin asignar'}</td>
                        <td className="p-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                            ${job.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${job.estado === 'En Progreso' ? 'bg-indigo-100 text-indigo-800' : ''}
                            ${job.estado === 'Completado' ? 'bg-green-100 text-green-800' : ''}`}>
                            {job.estado}
                            </span>
                        </td>
                        </tr>
                    ))
                    ) : (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500">No hay trabajos recientes.</td></tr>
                    )}
                </tbody>
                </table>
            )}
            </div>
        </div>
    </div>
  );
}
