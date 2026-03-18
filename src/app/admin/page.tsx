'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { 
  Users, 
  Activity, 
  Zap,
  ShieldCheck,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAdminHeader } from './components/AdminHeaderContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// --- Dashboard Sub-Components ---

const PremiumGlassCard = ({ title, children, className = "", icon: Icon }: any) => (
  <div className={`bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl ${className}`}>
    {/* Light mode (Comentado): bg-white/90 backdrop-blur-xl border-slate-200 */}
    <div className="flex justify-between items-start mb-6 border-b border-white/20 pb-4 relative z-10">
        <div className="flex items-center gap-3">
            {Icon && <div className="p-2 bg-primary/10 rounded-xl text-primary"><Icon size={18}/></div>}
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <button className="text-slate-400 hover:text-slate-900 transition-colors transition-transform active:scale-95">
           <MoreHorizontal size={20} />
        </button>
    </div>
    <div className="relative z-10">{children}</div>
    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
  </div>
);

const StatMiniCard = ({ label, value, colorClass = "text-primary" }: any) => (
    <div className="flex flex-col gap-1 p-4 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-colors relative group">
        {/* Light mode (Comentado): bg-white border-slate-100 hover:bg-slate-50 */}
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{label}</span>
        <span className={`text-2xl font-black tracking-tight ${colorClass} relative z-10`}>{value}</span>
    </div>
);

const InspectionProgressRow = ({ site, progress, status }: any) => (
    <div className="flex flex-col gap-2 p-4 glass-crystallized rounded-3xl hover:brightness-105 transition-all cursor-pointer relative">
        <div className="flex justify-between items-center text-xs uppercase tracking-tight">
            <span className="font-black text-slate-900">{site}</span>
            <span className="font-bold text-slate-500">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
                className={`h-full transition-all duration-1000 rounded-full ${status === 'Critical' ? 'bg-red-500' : 'bg-primary'}`} 
                style={{ width: `${progress}%` }}
            />
        </div>
        <div className="flex justify-between items-center mt-1">
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest
                ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                {status}
            </span>
            <div className="flex -space-x-2">
                {[1, 2].map(i => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600">T</div>
                ))}
            </div>
        </div>
    </div>
);

// --- Main Dashboard Page ---

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ 
    clients: 0, 
    pendingJobs: 0, 
    inProgressJobs: 0, 
    inspectors: 0, 
    totalJobs: 0, 
    completedJobs: 0,
    operationalInspectors: 0
  });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const db = useFirestore();
  const router = useRouter();

  const headerAction = useMemo(() => (
    <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-6 py-2 bg-white/5 border border-white/10 rounded-2xl shadow-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Terminal Activa</span>
        </div>
    </div>
  ), []);

  useAdminHeader('Engineering Hub', headerAction);

  useEffect(() => {
    if (!db) return;

    // Conteo de Clientes
    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setStats(prev => ({ ...prev, clients: snapshot.size }));
    });

    // Conteo y Estatus de Inspectores
    const unsubInspectors = onSnapshot(query(collection(db, 'usuarios'), where("roles", "array-contains", "inspector")), snapshot => {
        setStats(prev => ({ ...prev, inspectors: snapshot.size }));
    });

    // Métricas de Trabajos e Informes
    // 1. Trabajos Pendientes/En Progreso (de ordenes_trabajo)
    const unsubOrders = onSnapshot(collection(db, 'ordenes_trabajo'), snapshot => {
        let pending = 0;
        let inProgress = 0;
        const activeInspectorIds = new Set<string>();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.estado === 'Pendiente') pending++;
            if (data.estado === 'En Progreso') {
                inProgress++;
                // Rastrear inspectores ocupados
                if (data.inspectorIds) {
                    data.inspectorIds.forEach((id: string) => activeInspectorIds.add(id));
                }
            }
        });

        setStats(prev => ({ 
            ...prev, 
            pendingJobs: pending, 
            inProgressJobs: inProgress,
            // Personal operativo = los que tienen trabajos en progreso
            operationalInspectors: activeInspectorIds.size
        }));
    });

    // 2. Trabajos Completados (de informes)
    const unsubReports = onSnapshot(collection(db, 'informes'), snapshot => {
        setStats(prev => ({ ...prev, completedJobs: snapshot.size, totalJobs: prev.pendingJobs + prev.inProgressJobs + snapshot.size }));
        
        // Cargar los últimos 5 para la tabla de actividad
        const latest = snapshot.docs
            .slice(0, 5)
            .map(doc => ({ id: doc.id, ...doc.data() } as any));
        setRecentJobs(latest);
    });

    // 3. Gastos por Inspector
    const unsubExpenses = onSnapshot(collection(db, 'gastos'), snapshot => {
        const byInspector: Record<string, { nombre: string, total: number, count: number }> = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const name = data.inspectorNombre || 'Desconocido';
            if (!byInspector[name]) byInspector[name] = { nombre: name, total: 0, count: 0 };
            byInspector[name].total += (data.monto || 0);
            byInspector[name].count += 1;
        });
        setExpensesByInspector(Object.values(byInspector).sort((a, b) => b.total - a.total));
    });

    return () => {
      unsubClients();
      unsubInspectors();
      unsubOrders();
      unsubReports();
      unsubExpenses();
    };
  }, [db]);

  const [expensesByInspector, setExpensesByInspector] = useState<any[]>([]);

  // Calculate Personal Status
  const freeInspectors = Math.max(0, stats.inspectors - (stats.operationalInspectors || 0));
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 pb-20">
      
      {/* Row 1: Personal y Operatividad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Personal Status */}
        <PremiumGlassCard title="Estatus de Personal" className="lg:col-span-4" icon={Users}>
            <div className="space-y-6">
                <div className="glass-crystallized flex flex-col gap-2 p-4 rounded-3xl group">
                    <div className="flex justify-between items-center text-xs uppercase tracking-tight">
                        <span className="font-black text-emerald-600">Personal Operativo</span>
                        <span className="font-bold text-slate-900">{stats.operationalInspectors || 0}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(stats.operationalInspectors || 0) / stats.inspectors * 100}%` }} />
                    </div>
                </div>

                <div className="glass-crystallized flex flex-col gap-2 p-4 rounded-3xl group">
                    <div className="flex justify-between items-center text-xs uppercase tracking-tight">
                        <span className="font-black text-blue-500">Personal Libre</span>
                        <span className="font-bold text-slate-900">{freeInspectors}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${freeInspectors / stats.inspectors * 100}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatMiniCard label="Total Técnicos" value={stats.inspectors} colorClass="text-slate-600" />
                    <StatMiniCard label="Clientes Activos" value={stats.clients} colorClass="text-primary" />
                </div>
            </div>
        </PremiumGlassCard>

        {/* Carga de Trabajo (Gráfico) */}
        <PremiumGlassCard title="Rendimiento de Inspecciones" className="lg:col-span-8" icon={Activity}>
            <div className="h-[280px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        { name: 'Pendientes', value: stats.pendingJobs },
                        { name: 'En Curso', value: stats.inProgressJobs },
                        { name: 'Completadas', value: stats.completedJobs }
                    ]}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }} />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center mt-6">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Capacidad Utilizada</span>
                        <span className="text-xl font-black text-slate-900">{Math.round((stats.operationalInspectors || 0) / stats.inspectors * 100)}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Pendientes</span>
                        <span className="text-xl font-black text-amber-600">{stats.pendingJobs}</span>
                    </div>
                </div>
            </div>
        </PremiumGlassCard>
      </div>

      {/* Row 2: Gastos por Inspector + Última Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gastos por Inspector */}
        <PremiumGlassCard title="Control de Gastos por Inspector" icon={ShieldCheck}>
            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
                {expensesByInspector.length > 0 ? expensesByInspector.map((exp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 glass-crystallized rounded-3xl hover:brightness-105 transition-all group relative">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center font-black text-slate-400 group-hover:text-primary transition-colors border border-slate-100">
                                {exp.nombre.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-900">{exp.nombre}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{exp.count} reportes realizados</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-black text-primary">{exp.total.toFixed(2)}€</div>
                            <div className="text-[8px] font-black text-slate-400 uppercase">Total Acumulado</div>
                        </div>
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center gap-3 opacity-20">
                        <Zap size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Calculando balances...</span>
                    </div>
                )}
            </div>
        </PremiumGlassCard>

        {/* Últimas Inspecciones Realizadas */}
        <PremiumGlassCard title="Últimos Informes Generados" icon={Clock}>
            <div className="space-y-4">
                {recentJobs.length > 0 ? recentJobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between p-4 glass-crystallized rounded-3xl hover:brightness-105 transition-all group relative">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 uppercase group-hover:text-primary transition-colors">{job.clienteNombre || job.cliente || 'S/N'}</span>
                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                {job.inspectorNombre || 'Inspector Central'} • 
                                {job.fecha_creacion?.toDate ? job.fecha_creacion.toDate().toLocaleDateString() : 'Hoy'}
                            </span>
                        </div>
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-emerald-500/20">
                            PASS
                        </div>
                    </div>
                )) : (
                    <div className="py-20 flex flex-col items-center gap-3 opacity-20">
                        <Activity size={32} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Monitorizando actividad...</span>
                    </div>
                )}
            </div>
        </PremiumGlassCard>

      </div>
    </div>
  );
}

type Job = { 
  id: string; 
  clienteNombre?: string; 
  cliente?: string;
  estado: string; 
  inspectorNombres?: string[];
  inspectorNombre?: string;
  fecha_creacion?: any;
};