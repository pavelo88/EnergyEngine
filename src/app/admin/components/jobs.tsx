'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { PlusCircle, Loader2, Pencil, Trash2, Download, Search, X, ClipboardList, Settings, ClipboardCheck, Wrench, ChevronDown, User, Printer } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAdminHeader } from './AdminHeaderContext';
import { formatSafeDate } from '@/lib/utils';
import { getPdfFileName, normalizeReportForPdf } from '@/lib/pdf-utils';
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTecnicoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';
import { generatePDF as generateRevisionBasicaPDF } from '@/app/inspection/components/forms/RevisionBasicaForm';

// ────────── AUTOCOMPLETE COMBOBOX ──────────
function Combobox({ label, placeholder, items, value, onSelect, renderItem, filterKey = 'label' }: {
  label: string;
  placeholder: string;
  items: { id: string; label: string; sub?: string }[];
  value: string;
  onSelect: (id: string, label: string) => void;
  renderItem?: (item: { id: string; label: string; sub?: string }) => React.ReactNode;
  filterKey?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const found = items.find(i => i.id === value);
    setDisplay(found?.label || '');
    if (!value) setQuery('');
  }, [value, items]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    return items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
  }, [query, items]);

  const handleSelect = (item: { id: string; label: string }) => {
    onSelect(item.id, item.label);
    setDisplay(item.label);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="space-y-2" ref={ref}>
      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></div>
        <input
          type="text"
          className="w-full h-12 pl-9 pr-10 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary focus:bg-white transition-all text-sm"
          placeholder={open ? `Buscar ${placeholder}...` : (display || placeholder)}
          value={open ? query : ''}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
        />
        {value ? (
          <button type="button" onClick={() => { onSelect('', ''); setDisplay(''); setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors">
            <X size={16} />
          </button>
        ) : (
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
        {!open && display && (
          <div className="absolute inset-0 pointer-events-none pl-9 flex items-center">
            <span className="text-sm font-bold text-slate-900 truncate pr-10">{display}</span>
          </div>
        )}
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 font-bold uppercase">Sin resultados</p>
            ) : filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => handleSelect(item)}
                className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-start gap-3 ${ value === item.id ? 'bg-primary/5' : ''}`}
              >
                {renderItem ? renderItem(item) : (
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    {item.sub && <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.sub}</p>}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type Inspector = { id: string; nombre: string; };
type Cliente = { id: string; nombre: string; };
type Job = {
  id: string;
  numero_informe?: string;
  descripcion: string;
  clienteId: string;
  clienteNombre?: string;
  cliente?: string; 
  instalacion?: string;
  location?: { lat: number, lon: number };
  modelo?: string;
  n_motor?: string;
  inspectorIds: string[];
  inspectorNombres?: string[];
  tecnicoNombre?: string; 
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  fecha_creacion?: any;
  formType?: 'hoja-trabajo' | 'informe-revision' | 'informe-tecnico' | 'informe-simplificado' | 'revision-basica' | 'job' | string;
};

const FORM_TYPES = [
  { id: 'hoja-trabajo', label: 'Hoja de Trabajo', sub: 'Registro de materiales y servicios', icon: ClipboardList },
  { id: 'informe-tecnico', label: 'Informe Técnico', sub: 'Reporte detallado de intervenciones', icon: Settings },
  { id: 'informe-revision', label: 'Informe de Revisión', sub: 'Checklist completo de mantenimiento', icon: ClipboardCheck },
  { id: 'informe-simplificado', label: 'Informe Simplificado', sub: 'Para equipos sin checklist (ej. motobombas)', icon: Wrench },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Smart-search state
  const [selectedFormType, setSelectedFormType] = useState('');
  const [selectedFormLabel, setSelectedFormLabel] = useState('');
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Job['estado']>('Pendiente');
  const db = useFirestore();

  const openModalForAdd = useCallback(() => {
    setEditingJob(null);
    setIsModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const dataToExport = jobs.map((job: Job) => ({
      "N° INFORME": job.numero_informe || '',
      ID: job.id,
      Descripción: job.descripcion,
      Cliente: job.clienteNombre || job.cliente,
      Estado: job.estado,
      Fecha: formatSafeDate(job.fecha_creacion, 'dd/MM/yyyy'),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trabajos");
    XLSX.writeFile(workbook, `Reporte_Trabajos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [jobs]);

  const headerAction = useMemo(() => (
    <div className="flex gap-2">
        <Button onClick={handleExport} variant="outline" className="rounded-xl font-bold uppercase text-xs tracking-widest hidden md:flex border-slate-200 text-slate-800 dark:text-white">
            <Download className="mr-2" size={16} />
            Exportar Excel
        </Button>
        <Button onClick={openModalForAdd} className="rounded-xl font-black uppercase text-xs tracking-widest bg-primary text-white">
            <PlusCircle className="mr-2" size={16} />
            Nuevo Trabajo
        </Button>
    </div>
  ), [handleExport, openModalForAdd]);

  useAdminHeader('Gestión de Trabajos', headerAction);

  useEffect(() => {
    if (!db) return;
    let currentOrders: Job[] = [];
    let currentInformes: Job[] = [];
    const refreshJobs = () => {
      const merged = [...currentOrders, ...currentInformes].sort((a, b) => (b.fecha_creacion?.seconds || 0) - (a.fecha_creacion?.seconds || 0));
      setJobs(merged);
    };

    const qInspectors = query(collection(db, 'usuarios'));
    const unsubInspectors = onSnapshot(qInspectors, (snapshot: any) => {
      const inspectorList = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => user.roles && user.roles.includes('inspector'));
      setInspectors(inspectorList.map((user: any) => ({ id: user.id, nombre: user.nombre })));
    });

    const unsubClients = onSnapshot(collection(db, 'clientes'), (snapshot: any) => {
      setClients(snapshot.docs.map((doc: any) => ({ id: doc.id, nombre: doc.data().nombre })));
    });
    
    const qJobs = query(collection(db, 'ordenes_trabajo'), orderBy('fecha_creacion', 'desc'), limit(100));
    const unsubJobs = onSnapshot(qJobs, (snapshot: any) => {
      currentOrders = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...(doc.data() as Omit<Job, 'id'>)
      }));
      refreshJobs();
      setLoading(false);
    });

    const qInformes = query(collection(db, 'informes'), orderBy('fecha_creacion', 'desc'), limit(50));
    const unsubInformes = onSnapshot(qInformes, (snapshot: any) => {
      currentInformes = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          numero_informe: data.numero_informe || doc.id,  // Fallback: usar id si falta numero_informe
          ...(data as any)
        };
      });
      refreshJobs();
    });

    return () => {
      unsubInspectors();
      unsubClients();
      unsubJobs();
      unsubInformes();
    };
  }, [db]);
  
  useEffect(() => {
    if (editingJob) {
      const ft = FORM_TYPES.find(f => f.id === editingJob.formType);
      setSelectedFormType(editingJob.formType || 'job');
      setSelectedFormLabel(ft?.label || editingJob.descripcion || '');
      setSelectedInspectorId(editingJob.inspectorIds?.[0] || '');
      setSelectedClientId(editingJob.clienteId || '');
      setSelectedStatus(editingJob.estado || 'Pendiente');
    } else {
      setSelectedFormType('');
      setSelectedFormLabel('');
      setSelectedInspectorId('');
      setSelectedClientId('');
      setSelectedStatus('Pendiente');
    }
  }, [editingJob]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFormType || !selectedClientId) return;
    setFormLoading(true);
    const selectedClient = clients.find((c: Cliente) => c.id === selectedClientId);
    const selectedInspector = inspectors.find((i: Inspector) => i.id === selectedInspectorId);
    const formTypeMeta = FORM_TYPES.find(f => f.id === selectedFormType);

    const jobData = {
      descripcion: formTypeMeta?.label || selectedFormLabel,
      clienteId: selectedClientId,
      clienteNombre: selectedClient?.nombre || 'N/A',
      inspectorIds: selectedInspectorId ? [selectedInspectorId] : [],
      inspectorNombres: selectedInspector ? [selectedInspector.nombre] : [],
      estado: selectedStatus,
      formType: selectedFormType,
    };

    try {
      if (editingJob) {
        await updateDoc(doc(db!, 'ordenes_trabajo', editingJob.id), jobData);
      } else {
        await addDoc(collection(db!, "ordenes_trabajo"), { ...jobData, fecha_creacion: serverTimestamp() });
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el trabajo: ", error);
    }
    setFormLoading(false);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este trabajo?")) {
      try {
        await deleteDoc(doc(db, 'ordenes_trabajo', jobId));
      } catch (error) {
        console.error("Error al eliminar el trabajo: ", error);
      }
    }
  };
  
  const getJobTitle = (job: Job) => {
    if (job.formType === 'job') return job.descripcion;
    switch(job.formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        default: return job.descripcion || `Documento ${job.id}`;
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const canReprint = (job: Job) =>
    !!job.formType &&
    job.estado === 'Completado' &&
    ['hoja-trabajo', 'informe-revision', 'informe-tecnico', 'informe-simplificado', 'revision-basica'].includes(job.formType);

  const handleReprintSavedPdf = async (job: Job) => {
    if (!canReprint(job)) return;

    const finalId = job.numero_informe || job.id;
    const inspectorName = job.tecnicoNombre || job.inspectorNombres?.join(', ') || 'tecnico energy engine';
    const reportForPdf = await normalizeReportForPdf(job as any);
    let docPdf: any = null;

    try {
      switch (job.formType) {
        case 'hoja-trabajo':
          docPdf = generateHojaTrabajoPDF(reportForPdf, inspectorName, finalId);
          break;
        case 'informe-revision':
          docPdf = generateInformeRevisionPDF(reportForPdf, inspectorName, finalId);
          break;
        case 'informe-tecnico':
          docPdf = generateInformeTecnicoPDF(reportForPdf, inspectorName, finalId);
          break;
        case 'informe-simplificado':
          docPdf = generateInformeSimplificadoPDF(reportForPdf, inspectorName, finalId);
          break;
        case 'revision-basica':
          docPdf = generateRevisionBasicaPDF(reportForPdf, inspectorName, finalId);
          break;
        default:
          alert('Este tipo de documento no soporta reimpresion automatica.');
          return;
      }

      if (docPdf) {
        docPdf.save(getPdfFileName(finalId));
      }
    } catch (error) {
      console.error('Error al reimprimir PDF desde trabajos:', error);
      alert('No se pudo reimprimir el PDF.');
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto">
          {loading ? <p className="text-center font-black uppercase text-slate-200">Cargando Trabajos...</p> : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4">N° Informe</th>
                  <th className="pb-4">Descripción / Tipo</th>
                  <th className="pb-4">Cliente / Instalación</th>
                  <th className="pb-4">Especificaciones</th>
                  <th className="pb-4">Técnicos</th>
                  <th className="pb-4">Estado</th>
                  <th className="pb-4 text-right">Gestión</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-black text-slate-700">{job.numero_informe || '—'}</td>
                    <td className="py-4 font-black text-slate-700">{getJobTitle(job)}</td>
                    <td className="py-4">
                      <div className="font-bold text-slate-600 text-sm">{job.clienteNombre || job.cliente}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase">{job.instalacion || ''}</div>
                    </td>
                    <td className="py-4 text-[10px] font-black text-slate-400 uppercase">
                        {job.modelo && <div>MOD: {job.modelo}</div>}
                        {job.n_motor && <div>S/N: {job.n_motor}</div>}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500">{job.inspectorNombres?.join(', ') || job.tecnicoNombre || 'Pendiente'}</td>
                    <td className="py-4">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter
                          ${job.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600' : ''}
                          ${job.estado === 'En Progreso' ? 'bg-indigo-50 text-indigo-600' : ''}
                          ${job.estado === 'Completado' ? 'bg-emerald-50 text-emerald-600' : ''}`}>
                          {job.estado}
                        </span>
                    </td>
	                    <td className="py-4 text-right">
	                        <div className="flex justify-end gap-1">
	                          <button
                                onClick={() => handleReprintSavedPdf(job)}
                                className="p-2 text-slate-300 hover:text-emerald-500 transition-colors disabled:opacity-30"
                                disabled={!canReprint(job)}
                                title={canReprint(job) ? 'Reimprimir PDF' : 'Disponible solo para informes completados'}
                              >
                                <Printer size={18} />
                              </button>
	                          <button onClick={() => {setEditingJob(job);setIsModalOpen(true);}} className="p-2 text-slate-300 hover:text-primary transition-colors disabled:opacity-30" disabled={job.formType !== 'job'}><Pencil size={18}/></button>
	                          <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
	                        </div>
	                    </td>
                  </tr>
                ))}
                 {jobs.length === 0 && (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No se registran trabajos en el sistema.</td></tr>
                )}
              </tbody>
            </table>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg my-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingJob ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h2>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"><X size={16}/></button>
            </div>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-5">

              {/* DESCRIPCIÓN: Smart Cards de 4 tipos */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Formulario / Descripción</Label>
                <Combobox
                  label=""
                  placeholder="Buscar tipo de inspección..."
                  items={FORM_TYPES.map(f => ({ id: f.id, label: f.label, sub: f.sub }))}
                  value={selectedFormType}
                  onSelect={(id, label) => { setSelectedFormType(id); setSelectedFormLabel(label); }}
                  renderItem={(item) => {
                    const meta = FORM_TYPES.find(f => f.id === item.id);
                    const Icon = meta?.icon || ClipboardList;
                    return (
                      <div className="flex items-center gap-3 w-full">
                        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${ selectedFormType === item.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary' }`}>
                          <Icon size={18}/>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{item.label}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{item.sub}</p>
                        </div>
                      </div>
                    );
                  }}
                />
                {/* Preview del seleccionado */}
                {selectedFormType && (() => {
                  const meta = FORM_TYPES.find(f => f.id === selectedFormType);
                  const Icon = meta?.icon || ClipboardList;
                  return (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl mt-1">
                      <div className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0"><Icon size={16}/></div>
                      <div>
                        <p className="text-xs font-black text-primary">{meta?.label}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{meta?.sub}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* CLIENTE: Autocomplete */}
              <Combobox
                label="Vincular a Cliente"
                placeholder="Buscar cliente..."
                items={clients.map(c => ({ id: c.id, label: c.nombre }))}
                value={selectedClientId}
                onSelect={(id) => setSelectedClientId(id)}
              />

              {/* TÉCNICO: Autocomplete selección única */}
              <Combobox
                label="Asignar Técnico"
                placeholder="Buscar técnico..."
                items={inspectors.map(i => ({ id: i.id, label: i.nombre }))}
                value={selectedInspectorId}
                onSelect={(id) => setSelectedInspectorId(id)}
                renderItem={(item) => (
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${ selectedInspectorId === item.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600' }`}>
                      {item.label.charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                  </div>
                )}
              />

              {/* ESTADO */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Operativo</Label>
                <Select required value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50 font-bold h-12 text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="Pendiente">🟡 Pendiente</SelectItem>
                    <SelectItem value="En Progreso">🔵 En Progreso</SelectItem>
                    <SelectItem value="Completado">🟢 Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <Button
                  type="submit"
                  disabled={formLoading || !selectedFormType || !selectedClientId}
                  className="rounded-xl font-black uppercase text-xs tracking-widest bg-primary px-8 py-3 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {formLoading ? <><Loader2 size={14} className="animate-spin mr-2" />Procesando...</> : 'Confirmar Orden'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
