'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2, Download } from 'lucide-react';
import { cn, formatSafeDate } from '@/lib/utils';

interface Job {
  id: string;
  numero_informe?: string;
  estado: string;
  descripcion: string;
  clienteNombre?: string;
  cliente?: string;
  instalacion?: string;
  prioridad: string;
  fecha_creacion: any;
  formType?: string;
  sourceCollection?: string;
}

interface JobsTableProps {
  jobs: Job[];
  loading: boolean;
  selectedOT: Job | null;
  setSelectedOT: (job: Job | null) => void;
  handleEditJob: (job: Job) => void;
  handleDeleteJob: (job: Job) => void;
  handleApproveJob: (id: string, status: string) => void;
  getJobTitle: (job: Job) => string;
}

export default function JobsTable({
  jobs,
  loading,
  selectedOT,
  setSelectedOT,
  handleEditJob,
  handleDeleteJob,
  handleApproveJob,
  getJobTitle
}: JobsTableProps) {
  if (loading) return <p className="text-center font-black uppercase text-slate-200 py-20">Analizando Trabajos...</p>;

  return (
    <div className="bg-white p-0 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
      <div className="p-6 border-b border-slate-50 flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Listado de Órdenes de Trabajo</h3>
      </div>
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Nº OT</th>
              <th className="px-6 py-4">Título / Descripción</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4">Fecha creación</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4 text-center">Prioridad</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {jobs.map(job => (
              <tr 
                key={job.id} 
                onClick={() => setSelectedOT(selectedOT?.id === job.id ? null : job)}
                className={cn(
                  "group hover:bg-slate-50/80 transition-all cursor-pointer",
                  selectedOT?.id === job.id && "bg-primary/5"
                )}
              >
                <td className="px-6 py-5">
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{job.numero_informe || job.id}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="font-bold text-slate-800 text-sm">{getJobTitle(job)}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase">{job.formType || 'GENERAL'}</div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={cn(
                    "px-2 py-1 text-[8px] font-black rounded-full uppercase border",
                    job.estado === 'Completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                    job.estado === 'En Proceso' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    'bg-blue-50 text-blue-600 border-blue-200'
                  )}>
                    {job.estado || 'Registrada'}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="text-xs font-bold text-slate-600">{formatSafeDate(job.fecha_creacion, 'dd/MM/yyyy')}</div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-xs font-black text-slate-700 uppercase">{job.clienteNombre || job.cliente || '—'}</div>
                </td>
                <td className="px-6 py-5">
                  <div className="text-[10px] font-bold text-slate-500 max-w-[150px] truncate uppercase">{job.instalacion || '—'}</div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={cn(
                    "text-[10px] font-black uppercase",
                    job.prioridad === 'Alta' ? 'text-red-500' : job.prioridad === 'Media' ? 'text-amber-500' : 'text-blue-500'
                  )}>
                    {job.prioridad || 'Media'}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleEditJob(job); }} 
                      className="h-8 w-8 text-slate-400 hover:text-blue-600"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleApproveJob(job.id, job.estado); }} 
                      className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteJob(job); }} 
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="py-20 text-center text-xs font-black text-slate-300 uppercase italic tracking-widest">
                  No hay órdenes de trabajo registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
