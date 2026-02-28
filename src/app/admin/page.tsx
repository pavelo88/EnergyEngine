'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react';

// --- Tipos de Datos ---
type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
};
type Job = { id: string; clienteNombre: string; estado: string; inspectorNombres: string[]; };

// --- Componente de Tarjeta de Estadística ---
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

// --- Componente Principal del Dashboard ---
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
    // Suscripción a Clientes
    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    });

    // Suscripción a Inspectores
    const qInspectors = query(collection(db, 'usuarios'), where("rol", "==", "inspector"));
    const unsubInspectors = onSnapshot(qInspectors, snapshot => {
        setStats(prev => ({ ...prev, inspectors: snapshot.size }));
    });

    // Suscripción a Trabajos (para estadísticas y tabla de recientes)
    const qJobs = query(collection(db, 'trabajos'), orderBy('fechaCreacion', 'desc'));
    const unsubJobs = onSnapshot(qJobs, snapshot => {
      let pending = 0;
      let inProgress = 0;
      const jobs: Job[] = [];
      
      snapshot.forEach(doc => {
        const jobData = doc.data() as Job;
        if (jobData.estado === 'Pendiente') pending++;
        if (jobData.estado === 'En Progreso') inProgress++;
        if (jobs.length < 5) { // Limitar a los 5 más recientes para la tabla
            jobs.push({ id: doc.id, ...jobData });
        }
      });

      setStats(prev => ({ ...prev, pendingJobs: pending, inProgressJobs: inProgress }));
      setRecentJobs(jobs);
      setLoading(false);
    });

    // Limpiar suscripciones al desmontar el componente
    return () => {
      unsubClients();
      unsubInspectors();
      unsubJobs();
    };
  }, [db]);

  return (
    <div className="space-y-8 text-slate-900">
      <div>
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Un resumen de la actividad reciente.</p>
      </div>

      {/* --- Grid de Estadísticas --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Clientes Totales" value={stats.clients} icon={Users} color="bg-blue-500" />
        <StatCard title="Trabajos Pendientes" value={stats.pendingJobs} icon={Clock} color="bg-amber-500" />
        <StatCard title="Trabajos En Progreso" value={stats.inProgressJobs} icon={Briefcase} color="bg-indigo-500" />
        <StatCard title="Inspectores Activos" value={stats.inspectors} icon={Users} color="bg-green-500" />
      </div>

      {/* --- Tabla de Trabajos Recientes --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
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
                      <td className="p-3">{job.inspectorNombres.join(', ')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                          ${job.estado === 'Pendiente' ? 'bg-amber-100 text-amber-800' : ''}
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
