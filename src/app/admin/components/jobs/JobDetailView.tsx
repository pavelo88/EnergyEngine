'use client';

import React from 'react';
import {
  ClipboardList, Pencil, Trash2, X, User, MapPin, Settings,
  Users, Sparkles, Download, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSafeDate } from '@/lib/utils';

interface Job {
  id: string;
  numero_informe?: string;
  estado: string;
  descripcion: string;
  clienteNombre?: string;
  cliente?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  instalacion?: string;
  ciudad?: string;
  codigo_postal?: string;
  pais?: string;
  fecha_creacion: any;
  prioridad: string;
  inspectorNombres?: string[];
  inspectorIds?: string[];
  clienteId?: string;
  motor?: string;
  modelo?: string;
  n_motor?: string;
  formType?: string;
}

interface JobDetailViewProps {
  selectedOT: Job;
  setSelectedOT: (job: Job | null) => void;
  handleEditJob: (job: Job) => void;
  handleDeleteJob: (job: Job) => void;
  handleApproveJob: (id: string, status: string) => void;
  handleEditReport: (report: Job) => void;
  handleReprintSavedPdf: (job: Job) => void;
  onGenerateReport: (type: string) => void;
  relatedReports: Job[];
  getJobTitle: (job: Job) => string;
}

export default function JobDetailView({
  selectedOT,
  setSelectedOT,
  handleEditJob,
  handleDeleteJob,
  handleApproveJob,
  handleEditReport,
  handleReprintSavedPdf,
  onGenerateReport,
  relatedReports,
  getJobTitle
}: JobDetailViewProps) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-primary/20 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
      {/* Header Detalle */}
      <div className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-primary/20">
            <ClipboardList size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedOT.numero_informe || selectedOT.id}</h2>
              <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase bg-blue-100 text-blue-600`}>{selectedOT.estado}</span>
            </div>
            <p className="text-lg font-bold text-slate-500 uppercase">{selectedOT.descripcion}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleEditJob(selectedOT)}
            className="rounded-xl font-black bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={16} className="mr-2" /> Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDeleteJob(selectedOT)}
            className="rounded-xl font-black"
          >
            <Trash2 size={16} className="mr-2" /> Eliminar
          </Button>
          <button
            onClick={() => setSelectedOT(null)}
            className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 1. Información General */}
        <div className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <User size={14} className="text-primary" /> Información General
          </h4>
          <div className="grid gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cliente</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.clienteNombre || selectedOT.cliente || '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Contacto</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.contacto || 'No especificado'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Teléfono</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.telefono || '—'}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Email</p>
              <p className="text-sm font-bold text-slate-600 truncate">{selectedOT.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* 2. Ubicación */}
        <div className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Ubicación
          </h4>
          <div className="grid gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Dirección</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.direccion || selectedOT.instalacion || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ciudad</p>
                <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.ciudad || '—'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">C.P.</p>
                <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.codigo_postal || '—'}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">País</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.pais || 'España'}</p>
            </div>
          </div>
        </div>

        {/* 3. Detalles de la OT */}
        <div className="space-y-6">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Settings size={14} className="text-primary" /> Detalles de la OT
          </h4>
          <div className="grid gap-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fecha Creación</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{formatSafeDate(selectedOT.fecha_creacion, 'dd/MM/yyyy HH:mm')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Prioridad</p>
                <span className={`text-[10px] font-black uppercase ${selectedOT.prioridad === 'Alta' ? 'text-red-500' : selectedOT.prioridad === 'Media' ? 'text-amber-500' : 'text-blue-500'}`}>{selectedOT.prioridad || 'Media'}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estado</p>
                <span className="text-[10px] font-black text-primary uppercase">{selectedOT.estado}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Descripción</p>
              <p className="text-sm font-bold text-slate-800 uppercase">{selectedOT.descripcion}</p>
            </div>
          </div>
        </div>

        {/* 4. Técnicos Asignados */}
        <div className="lg:col-span-3 border-t border-slate-100 pt-8">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
            <Users size={14} className="text-primary" /> Personal Operativo Asignado
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(selectedOT.inspectorNombres || []).map((nombre, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[11px] font-black text-slate-400 uppercase">{nombre.charAt(0)}</div>
                <div>
                  <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{nombre}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Técnico Asignado</p>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Listado de Partes Relacionados */}
        <div className="lg:col-span-3 space-y-4 pt-4 border-t border-slate-100 mt-8">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex justify-between items-center">
            <span>Partes de Trabajo Realizados</span>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-500">{relatedReports.length} Documentos</span>
          </h4>

          <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/50">
                  <th className="px-6 py-4">Nº Informe</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {relatedReports.map(report => (
                  <tr key={report.id} className="hover:bg-white transition-colors group">
                    <td className="px-6 py-4 font-bold text-slate-800 text-xs">{report.numero_informe || report.id}</td>
                    <td className="px-6 py-4">
                      <div className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase inline-block">
                        {getJobTitle(report)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${report.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {report.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                      {formatSafeDate(report.fecha_creacion, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleReprintSavedPdf(report)} className="h-8 w-8 text-slate-400 hover:text-primary"><Download size={14} /></Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditReport(report)}
                          disabled={report.estado === 'Aprobado'}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleApproveJob(report.id, report.estado)} className="h-8 w-8 text-slate-400 hover:text-emerald-600"><CheckCircle2 size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteJob(report)} className="h-8 w-8 text-slate-400 hover:text-red-500"><Trash2 size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {relatedReports.length === 0 && (
              <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase italic">Aún no se han generado informes vinculados a esta OT</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
