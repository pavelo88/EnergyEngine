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
  fecha_creacion: any;
  formType?: string;
  tecnicoNombre?: string;
  inspectorNombres?: string[];
}

interface ReportsTableProps {
  reports: Job[];
  loading: boolean;
  handleEditJob: (job: Job) => void;
  handleDeleteJob: (job: Job) => void;
  handleApproveJob: (id: string, status: string) => void;
  handleReprintSavedPdf: (job: Job) => void;
  getJobTitle: (job: Job) => string;
}

export default function ReportsTable({
  reports,
  loading,
  handleEditJob,
  handleDeleteJob,
  handleApproveJob,
  handleReprintSavedPdf,
  getJobTitle
}: ReportsTableProps) {
  if (loading) return <p className="text-center font-black uppercase text-slate-200 py-20">Cargando Historial...</p>;

  return (
    <div className="bg-white p-0 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
      <div className="p-6 border-b border-slate-50">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Historial Maestro de Informes</h3>
      </div>
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Nº Informe</th>
              <th className="px-6 py-4">Cliente / Instalación</th>
              <th className="px-6 py-4">Técnico</th>
              <th className="px-6 py-4">Tipo de Informe</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reports.map(report => (
              <tr key={report.id} className="group hover:bg-slate-50 transition-all">
                <td className="px-6 py-4">
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{report.numero_informe || report.id}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-black text-slate-800 uppercase leading-none mb-1">{report.clienteNombre || report.cliente || '—'}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{report.instalacion || '—'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs font-bold text-slate-600 uppercase">{report.tecnicoNombre || report.inspectorNombres?.join(', ') || '—'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase inline-block">
                    {getJobTitle(report)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase",
                    report.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  )}>
                    {report.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-500">
                  {formatSafeDate(report.fecha_creacion, 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReprintSavedPdf(report)}
                      className="h-8 w-8 text-slate-400 hover:text-primary"
                      title="Descargar PDF"
                    >
                      <Download size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditJob(report)}
                      disabled={report.estado === 'Aprobado'}
                      className={cn(
                        "h-8 w-8 text-slate-400 hover:text-blue-600",
                        report.estado === 'Aprobado' && "opacity-20 cursor-not-allowed"
                      )}
                      title="Editar Informe"
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleApproveJob(report.id, report.estado)}
                      className="h-8 w-8 text-slate-400 hover:text-emerald-600"
                      title="Aprobar Informe"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteJob(report)}
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      title="Eliminar Informe"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-xs font-black text-slate-300 uppercase italic tracking-widest">
                  No se encontraron informes en el historial
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
