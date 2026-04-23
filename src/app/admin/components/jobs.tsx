'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { PlusCircle, Loader2, Pencil, Trash2, Download, Search, X, ClipboardList, Settings, ClipboardCheck, Wrench, ChevronDown, User, Printer } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAdminHeader } from './AdminHeaderContext';
import { useToast } from '@/hooks/use-toast';
import { formatSafeDate } from '@/lib/utils';
import { getPdfFileName, normalizeReportForPdf } from '@/lib/pdf-utils';
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTecnicoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';
import { generatePDF as generateRevisionBasicaPDF } from '@/app/inspection/components/forms/RevisionBasicaForm';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HojaTrabajoForm from '@/app/inspection/components/forms/HojaTrabajoForm';
import InformeRevisionForm from '@/app/inspection/components/forms/InformeRevisionForm';
import InformeTecnicoForm from '@/app/inspection/components/forms/InformeTecnicoForm';
import InformeSimplificadoForm from '@/app/inspection/components/forms/InformeSimplificadoForm';
import RevisionBasicaForm from '@/app/inspection/components/forms/RevisionBasicaForm';
import { FileText, CheckCircle2, Sparkles, MapPin } from 'lucide-react';
import { suggestCorrections } from '@/ai/flows/suggest-corrections-flow';

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
          className="w-full h-12 pl-9 pr-10 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#10b981] focus:bg-white transition-all text-sm"
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
                className={`w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-start gap-3 ${value === item.id ? 'bg-primary/5' : ''}`}
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
  sourceCollection?: string; // Propiedad agregada para saber de dónde viene
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
  estado: 'Asignado' | 'Registrado' | 'Aprobado';
  fecha_creacion?: any;
  formType?: 'hoja-trabajo' | 'informe-revision' | 'informe-tecnico' | 'informe-simplificado' | 'revision-basica' | 'job' | string;
  tecnicoId?: string;
  originalJobId?: string;
};

const FORM_TYPES = [
  { id: 'hoja-trabajo', label: 'Hoja de Trabajo', sub: 'Registro de materiales y servicios', icon: ClipboardList },
  { id: 'informe-tecnico', label: 'Informe Técnico', sub: 'Reporte detallado de intervenciones', icon: Settings },
  { id: 'informe-revision', label: 'Informe de Revisión', sub: 'Checklist completo de mantenimiento', icon: ClipboardCheck },
  { id: 'informe-simplificado', label: 'Informe Simplificado', sub: 'Para equipos sin checklist (ej. motobombas)', icon: Wrench },
];

export default function JobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedReportForEdit, setSelectedReportForEdit] = useState<Job | null>(null);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<Job['estado']>('Asignado');

  // Form/Modal states (for adding/editing)
  const [selectedFormType, setSelectedFormType] = useState('');
  const [selectedFormLabel, setSelectedFormLabel] = useState('');
  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Dashboard filter states (for the table)
  const [filterQuery, setFilterQuery] = useState('');
  const [filterInspectorId, setFilterInspectorId] = useState('all');
  const [filterClientId, setFilterClientId] = useState('all');
  const [filterReportType, setFilterReportType] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const db = useFirestore();

  const openModalForAdd = useCallback(() => {
    setEditingJob(null);
    setIsModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    const workbook = XLSX.utils.book_new();

    const flattenObject = (obj: any, prefix = '') => {
      const flattened: any = {};
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && !obj[key]._seconds) {
          Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}_`));
        } else if (Array.isArray(obj[key])) {
          if (key.toLowerCase().includes('image')) {
            obj[key].forEach((url: string, index: number) => {
              flattened[`${prefix}${key}_${index + 1}`] = url;
            });
          } else {
            flattened[`${prefix}${key}`] = obj[key].join(', ');
          }
        } else {
          let val = obj[key];
          if (val && typeof val === 'object' && (val.seconds || val._seconds)) {
            val = formatSafeDate(val, 'dd/MM/yyyy HH:mm');
          }
          flattened[`${prefix}${key}`] = val;
        }
      }
      return flattened;
    };

    FORM_TYPES.forEach(form => {
      const filteredByForm = jobsFiltrados.filter(j => j.formType === form.id);
      if (filteredByForm.length === 0) return;

      const dataToExport = filteredByForm.map((job: any) => {
        const flat = flattenObject(job);

        // --- ORDENAMIENTO LÓGICO DE COLUMNAS (Prioridad del Admin) ---
        const ordered: any = {};

        // 1. Metadatos Generales
        ordered['N° INFORME'] = job.numero_informe || job.id;
        ordered['FECHA'] = formatSafeDate(job.fecha_creacion, 'dd/MM/yyyy HH:mm');
        ordered['INSPECTOR'] = job.tecnicoNombre || job.inspectorNombres?.join(', ') || 'Pendiente';
        ordered['TIPO'] = form.label;
        ordered['ESTADO'] = job.estado;

        // 2. Información del Cliente
        ordered['CLIENTE'] = job.clienteNombre || job.cliente;
        ordered['INSTALACIÓN / SEDE'] = job.instalacion || '';

        // 3. Campos Técnicos (Variables según el formulario)
        // Agregamos todos los demás campos del flat que no hemos puesto aún
        Object.keys(flat).forEach(key => {
          const upperKey = key.toUpperCase();
          if (!['ID', 'NUMERO_INFORME', 'FECHA_CREACION', 'TECNICONOMBRE', 'INSPECTORNOMBRES', 'ESTADO', 'CLIENTE', 'CLIENTENOMBRE', 'INSTALACION', 'FORMTYPE', 'SOURCECOLLECTION'].includes(upperKey)) {
            if (!upperKey.includes('IMAGE') && !upperKey.includes('OBSERVAC')) {
              ordered[upperKey] = flat[key];
            }
          }
        });

        // 4. Ubicación y Multimedia
        if (job.location?.lat && job.location?.lon) {
          ordered['UBICACIÓN_MAPS'] = `https://www.google.com/maps?q=${job.location.lat},${job.location.lon}`;
        }

        Object.keys(flat).forEach(key => {
          if (key.toLowerCase().includes('image')) {
            ordered[key.toUpperCase()] = flat[key];
          }
        });

        // 5. Final: Observaciones
        ordered['OBSERVACIONES'] = job.observaciones || job.comentarios_finales || '';

        return ordered;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: range.e.c, r: 0 } }) };

      XLSX.utils.book_append_sheet(workbook, worksheet, form.label.substring(0, 31));
    });

    XLSX.writeFile(workbook, `Reporte_Energia_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
        .filter((user: any) => user.roles && (user.roles.includes('inspector') || user.roles.includes('super')));
      setInspectors(inspectorList.map((user: any) => ({ id: user.id, nombre: user.nombre })));
    });

    const unsubClients = onSnapshot(collection(db, 'clientes'), (snapshot: any) => {
      setClients(snapshot.docs.map((doc: any) => ({ id: doc.id, nombre: doc.data().nombre })));
    });

    const qJobs = query(collection(db, 'ordenes_trabajo'), orderBy('fecha_creacion', 'desc'), limit(100));
    const unsubJobs = onSnapshot(qJobs, (snapshot: any) => {
      currentOrders = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        sourceCollection: 'ordenes_trabajo', // Marcamos origen
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
          sourceCollection: 'informes', // Marcamos origen
          numero_informe: data.numero_informe || doc.id,
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

  const jobsFiltrados = useMemo(() => {
    return jobs.filter(job => {
      const matchQuery = !filterQuery ||
        (job.numero_informe?.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (job.clienteNombre?.toLowerCase().includes(filterQuery.toLowerCase())) ||
        (job.descripcion?.toLowerCase().includes(filterQuery.toLowerCase()));

      const matchInspector = filterInspectorId === 'all' ||
        job.inspectorIds?.includes(filterInspectorId) ||
        job.tecnicoId === filterInspectorId;

      const matchClient = filterClientId === 'all' || job.clienteId === filterClientId;
      const matchType = filterReportType === 'all' || job.formType === filterReportType;

      let matchDate = true;
      if (filterDateStart || filterDateEnd) {
        const jobDate = job.fecha_creacion?.toDate ? job.fecha_creacion.toDate() : new Date();
        if (filterDateStart) {
          const start = new Date(filterDateStart);
          if (jobDate < start) matchDate = false;
        }
        if (filterDateEnd) {
          const end = new Date(filterDateEnd);
          end.setHours(23, 59, 59, 999);
          if (jobDate > end) matchDate = false;
        }
      }

      return matchQuery && matchInspector && matchClient && matchType && matchDate;
    });
  }, [jobs, filterQuery, filterInspectorId, filterClientId, filterReportType, filterDateStart, filterDateEnd]);

  useEffect(() => {
    if (editingJob) {
      const ft = FORM_TYPES.find(f => f.id === editingJob.formType);
      setSelectedFormType(editingJob.formType || 'job');
      setSelectedFormLabel(ft?.label || editingJob.descripcion || '');
      setSelectedInspectorId(editingJob.inspectorIds?.[0] || '');
      setSelectedClientId(editingJob.clienteId || '');
    } else {
      setSelectedFormType('');
      setSelectedFormLabel('');
      setSelectedInspectorId('');
      setSelectedClientId('');
    }
  }, [editingJob]);

  const handleApproveJob = async (job: Job) => {
    if (!job.id || !db) return;
    if (!confirm(`¿Estás seguro de que deseas aprobar definitivamente el informe ${job.numero_informe || job.id}?`)) return;

    try {
      await updateDoc(doc(db, 'informes', job.id), {
        estado: 'Aprobado',
        fecha_aprobacion: Timestamp.now(),
        aprobadoPor: 'Admin'
      });
      // También actualizar la orden de trabajo si existe
      if (job.originalJobId) {
        await updateDoc(doc(db, 'ordenes_trabajo', job.originalJobId), {
          estado: 'Aprobado'
        });
      }
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, estado: 'Aprobado' } : j));
    } catch (e) {
      console.error("Error approving job:", e);
      alert("Error al aprobar el informe.");
    }
  };

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
      estado: 'Asignado',
      formType: selectedFormType,
    };

    try {
      if (editingJob) {
        // Actualiza en la colección correcta
        const targetCollection = editingJob.sourceCollection || 'ordenes_trabajo';
        await updateDoc(doc(db!, targetCollection, editingJob.id), jobData);
      } else {
        await addDoc(collection(db!, "ordenes_trabajo"), { ...jobData, fecha_creacion: serverTimestamp() });
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el trabajo: ", error);
    }
    setFormLoading(false);
  };

  const handleDeleteJob = async (job: Job) => {
    if (window.confirm("¿Seguro que quieres eliminar este trabajo?")) {
      try {
        // Borrado paralelo: intentamos eliminar en ambas colecciones por seguridad
        await Promise.all([
          deleteDoc(doc(db, 'ordenes_trabajo', job.id)),
          deleteDoc(doc(db, 'informes', job.id))
        ]);
      } catch (error) {
        console.error("Error al eliminar el trabajo: ", error);
      }
    }
  };

  const getJobTitle = (job: Job) => {
    if (job.formType === 'job') return job.descripcion;
    switch (job.formType) {
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
    ['Registrado', 'Aprobado'].includes(job.estado) &&
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
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* BARRA DE FILTROS INTELIGENTE */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Buscador</Label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              placeholder="N° Informe, Cliente..."
              className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Inspector</Label>
          <Select value={filterInspectorId} onValueChange={setFilterInspectorId}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectItem value="all" className="text-xs font-bold">TODOS LOS TÉCNICOS</SelectItem>
              {inspectors.map(i => <SelectItem key={i.id} value={i.id} className="text-xs font-bold">{i.nombre.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Tipo Reporte</Label>
          <Select value={filterReportType} onValueChange={setFilterReportType}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectItem value="all" className="text-xs font-bold">TODOS LOS TIPOS</SelectItem>
              {FORM_TYPES.map(ft => <SelectItem key={ft.id} value={ft.id} className="text-xs font-bold">{ft.label.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Desde</Label>
          <Input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold" />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Hasta</Label>
          <Input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? <p className="text-center font-black uppercase text-slate-200 py-20">Analizando Trabajos...</p> : (
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left">
              <thead className="bg-[#062113]">
                <tr className="text-[9px] font-black text-white uppercase tracking-[0.15em] text-center border-b border-white/10">
                  <th className="px-5 py-5 text-left rounded-tl-2xl">Informe</th>
                  <th className="px-5 py-5 text-left">Descripción / Tipo</th>
                  <th className="px-5 py-5 text-left">Cliente / Instalación</th>
                  <th className="px-5 py-5">Especificaciones</th>
                  <th className="px-5 py-5">Técnicos</th>
                  <th className="px-5 py-5">Estado</th>
                  <th className="px-5 py-5 text-right rounded-tr-2xl">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobsFiltrados.map(job => (
                  <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-black text-[#0f172a] text-sm">{job.numero_informe || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-900 text-xs uppercase tracking-tight">{getJobTitle(job)}</div>
                      <div className="text-[9px] font-bold text-slate-400">{job.formType || 'GENERAL'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-black text-slate-700 text-xs uppercase">{job.clienteNombre || job.cliente}</div>
                      <div className="text-[9px] font-black text-[#10b981] uppercase tracking-tighter">{job.instalacion || ''}</div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="text-[8px] font-black text-slate-400 uppercase leading-tight">
                        {job.modelo && <div>MOD: {job.modelo}</div>}
                        {job.n_motor && <div>S/N: {job.n_motor}</div>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{job.inspectorNombres?.join(', ') || job.tecnicoNombre || 'Pendiente'}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className={`px-3 py-1.5 text-[8px] font-black rounded-md inline-block uppercase tracking-widest
                          ${job.estado === 'Asignado' ? 'bg-amber-50 text-amber-600 border border-amber-100' : ''}
                          ${job.estado === 'Registrado' ? 'bg-blue-50 text-blue-600 border border-blue-100' : ''}
                          ${job.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : ''}
                    `}>
                        {job.estado}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        {job.estado === 'Registrado' && (
                          <Button
                            onClick={() => handleApproveJob(job)}
                            variant="outline" size="icon"
                            className="h-8 w-8 bg-[#10b981] border-[#10b981] rounded-lg text-white hover:bg-emerald-600 transition-all shadow-sm"
                            title="Aprobar Definitivamente"
                          >
                            <CheckCircle2 size={14} />
                          </Button>
                        )}
                        {canReprint(job) && (
                          <Button onClick={() => handleReprintSavedPdf(job)} variant="outline" size="icon" className="h-8 w-8 bg-slate-800 border-slate-800 rounded-lg text-white hover:bg-[#10b981] hover:border-[#10b981] transition-all" title="Reimprimir PDF">
                            <Download size={14} />
                          </Button>
                        )}
                        <Button onClick={() => {
                          if (job.formType === 'job' || !job.formType) {
                            setEditingJob(job);
                            setIsModalOpen(true);
                          } else {
                            setSelectedReportForEdit(job);
                            setIsReportEditorOpen(true);
                          }
                        }} variant="outline" size="icon" className="h-8 w-8 bg-slate-800 border-slate-800 rounded-lg text-white hover:bg-[#062113] hover:border-[#062113] transition-all" title="Editar">
                          <Pencil size={14} />
                        </Button>
                        <Button onClick={() => handleDeleteJob(job)} variant="outline" size="icon" className="h-8 w-8 bg-red-600 border-red-600 rounded-lg text-white hover:bg-red-700 hover:border-red-700 transition-all" title="Eliminar">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobsFiltrados.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No se registran trabajos con estos filtros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-lg my-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingJob ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h2>
              <button type="button" onClick={closeModal} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"><X size={16} /></button>
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
                        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${selectedFormType === item.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                          <Icon size={18} />
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
                      <div className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center flex-shrink-0"><Icon size={16} /></div>
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${selectedInspectorId === item.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {item.label.charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                  </div>
                )}
              />

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

      {/* REPORT EDITOR MODAL */}
      <Dialog open={isReportEditorOpen} onOpenChange={setIsReportEditorOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0 rounded-[2.5rem] bg-white text-slate-950 border-none shadow-2xl">
          <DialogHeader className="p-8 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <FileText size={20} />
              </div>
              Revisión Administrativa: {selectedReportForEdit?.numero_informe || selectedReportForEdit?.id}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!selectedReportForEdit) return;
                  setIsAiLoading(true);
                  try {
                    const res = await suggestCorrections({ reportData: selectedReportForEdit });
                    setAiSuggestions(res);
                    toast({ title: "Análisis IA Completado", description: "Revisa las sugerencias en el formulario." });
                  } catch (err) {
                    toast({ variant: "destructive", title: "Error IA", description: "No se pudo conectar con el servicio." });
                  } finally { setIsAiLoading(false); }
                }}
                disabled={isAiLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
              >
                {isAiLoading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
                {isAiLoading ? 'Analizando...' : 'Analizar con IA'}
              </Button>
            </div>
          </DialogHeader>
          <div className="p-4 md:p-8">
            {(() => {
              if (!selectedReportForEdit) return null;
              const props = {
                initialData: selectedReportForEdit,
                aiData: aiSuggestions,
                onSuccess: () => {
                  setIsReportEditorOpen(false);
                  setSelectedReportForEdit(null);
                  setAiSuggestions(null);
                },
                isAdmin: true
              };

              switch (selectedReportForEdit.formType) {
                case 'hoja-trabajo': return <HojaTrabajoForm {...props} />;
                case 'informe-revision': return <InformeRevisionForm {...props} />;
                case 'informe-tecnico': return <InformeTecnicoForm {...props} />;
                case 'informe-simplificado': return <InformeSimplificadoForm {...props} />;
                case 'revision-basica': return <RevisionBasicaForm {...props} />;
                default: return <p className="p-10 text-center font-bold">Tipo de formulario no soportado para edición directa.</p>;
              }
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}