'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy, where, getDocs, limit } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { useAdminHeader } from './AdminHeaderContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { getNextOTId, decrementOTCounterIfLast } from '@/lib/ot-utils';
import { getPdfFileName, normalizeReportForPdf } from '@/lib/pdf-utils';
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTecnicoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';
import { generatePDF as generateRevisionBasicaPDF } from '@/app/inspection/components/forms/RevisionBasicaForm';
import { suggestCorrections } from '@/ai/flows/suggest-corrections-flow';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Auxiliares Refactorizados
import JobDetailView from './jobs/JobDetailView';
import JobsTable from './jobs/JobsTable';
import ReportsTable from './jobs/ReportsTable';
import JobFormModal from './jobs/JobFormModal';
import ReportEditorDialog from './jobs/ReportEditorDialog';

const FORM_TYPES = [
  { id: 'hoja-trabajo', label: 'Hoja de Trabajo', sub: 'Registro de materiales y servicios' },
  { id: 'informe-tecnico', label: 'Informe Técnico', sub: 'Reporte detallado de intervenciones' },
  { id: 'informe-revision', label: 'Informe de Revisión', sub: 'Checklist completo de mantenimiento' },
  { id: 'informe-simplificado', label: 'Informe Simplificado', sub: 'Para equipos sin checklist (ej. motobombas)' },
  { id: 'revision-basica', label: 'Revisión Básica', sub: 'Checklist básico de inspección' },
];

export default function JobsPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { setHeaderProps } = useAdminHeader();

  // Data States
  const [jobs, setJobs] = useState<any[]>([]);
  const [allInformes, setAllInformes] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View/Navigation States
  const [activeView, setActiveView] = useState<'ots' | 'reports'>('ots');
  const [selectedOT, setSelectedOT] = useState<any>(null);
  const [relatedReports, setRelatedReports] = useState<any[]>([]);

  // Modal/Editor States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isReportEditorOpen, setIsReportEditorOpen] = useState(false);
  const [selectedReportForEdit, setSelectedReportForEdit] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter States
  const [filterQuery, setFilterQuery] = useState('');
  const [filterInspectorId, setFilterInspectorId] = useState('all');
  const [filterReportType, setFilterReportType] = useState('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // 1. Fetching
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    const unsubJobs = onSnapshot(query(collection(db, 'ordenes_trabajo'), orderBy('fecha_creacion', 'desc'), limit(500)), (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, sourceCollection: 'ordenes_trabajo', ...d.data() })));
    });

    const unsubInspectors = onSnapshot(query(collection(db, 'usuarios'), where("roles", "array-contains-any", ["inspector", "super", "admin"])), (snap) => {
      setInspectors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubClients = onSnapshot(collection(db, 'clientes'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReports = onSnapshot(query(collection(db, 'informes'), orderBy('fecha_creacion', 'desc'), limit(500)), (snap) => {
      setAllInformes(snap.docs.map(d => ({ id: d.id, sourceCollection: 'informes', ...d.data() })));
    });

    setLoading(false);
    return () => { unsubJobs(); unsubInspectors(); unsubClients(); unsubReports(); };
  }, [db]);

  // 2. Dynamic Header
  useEffect(() => {
    const headerAction = (
      <div className="flex flex-col md:flex-row items-center gap-4">
        {/* Selector de Vistas */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0 border border-slate-200">
          <button 
            onClick={() => { setActiveView('ots'); setSelectedOT(null); }} 
            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${activeView === 'ots' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Órdenes de Trabajo
          </button>
          <button 
            onClick={() => { setActiveView('reports'); setSelectedOT(null); }} 
            className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${activeView === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Historial de Informes
          </button>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2">
          <Button onClick={handleExportExcel} variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-slate-600 font-black text-[10px] gap-2 px-4 uppercase hover:bg-slate-50">Excel</Button>
          <Button onClick={() => { setEditingJob(null); setIsModalOpen(true); }} className="h-10 rounded-xl bg-primary text-white font-black text-[10px] gap-2 px-6 uppercase shadow-lg shadow-primary/20">Nueva OT</Button>
        </div>
      </div>
    );

    setHeaderProps({
      title: activeView === 'ots' ? 'Gestión de Operaciones (OT)' : 'Control de Calidad e Informes',
      action: headerAction
    });
  }, [setHeaderProps, activeView]);

  // 3. Logic: Filters
  const filteredData = useMemo(() => {
    const source = activeView === 'ots' ? jobs : allInformes;
    return source.filter(j => {
      const matchQuery = !filterQuery || 
        (j.numero_informe || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
        (j.clienteNombre || j.cliente || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
        (j.descripcion || '').toLowerCase().includes(filterQuery.toLowerCase());
      
      const matchInspector = filterInspectorId === 'all' || (j.inspectorIds || []).includes(filterInspectorId);
      const matchType = filterReportType === 'all' || j.formType === filterReportType;
      
      let matchDate = true;
      if (filterDateStart || filterDateEnd) {
        const d = j.fecha_creacion?.toDate ? j.fecha_creacion.toDate() : (j.fecha_creacion ? new Date(j.fecha_creacion) : null);
        if (d) {
          if (filterDateStart && d < new Date(filterDateStart)) matchDate = false;
          if (filterDateEnd && d > new Date(filterDateEnd + 'T23:59:59')) matchDate = false;
        }
      }

      return matchQuery && matchInspector && matchType && matchDate;
    });
  }, [activeView, jobs, allInformes, filterQuery, filterInspectorId, filterReportType, filterDateStart, filterDateEnd]);

  // 4. Logic: Related Reports
  useEffect(() => {
    if (selectedOT) {
      setRelatedReports(allInformes.filter(inf => inf.originalJobId === selectedOT.id || inf.orderId === selectedOT.id));
    }
  }, [selectedOT, allInformes]);

  // 5. Handlers
  const handleExportExcel = async () => {
    toast({ title: 'Generando Excel', description: 'Obteniendo todos los datos vinculados, por favor espera...' });

    const otIds = new Set(filteredData.map(j => j.id));

    // 1. Resumen OTs
    const otData = filteredData.map(j => ({
      'ID OT': j.numero_informe || j.id,
      Estado: j.estado,
      Descripción: j.descripcion,
      Cliente: j.clienteNombre || j.cliente || '—',
      Contacto: j.contacto || '—',
      Teléfono: j.telefono || '—',
      Email: j.email || '—',
      Dirección: j.direccion || '—',
      Ciudad: j.ciudad || '—',
      'Código Postal': j.codigo_postal || '—',
      País: j.pais || '—',
      Instalación: j.instalacion || '—',
      'Fecha Creación': j.fecha_creacion?.toDate ? format(j.fecha_creacion.toDate(), 'dd/MM/yyyy') : '—',
      Prioridad: j.prioridad || '—',
      Inspectores: (j.inspectorNombres || []).join(', '),
      Motor: j.motor || '—',
      Modelo: j.modelo || '—',
      'Nº Motor': j.n_motor || '—'
    }));

    let horasList: any[] = [];
    let gastosList: any[] = [];

    try {
      const [horasSnap, gastosSnap] = await Promise.all([
        getDocs(collection(db, 'bitacora_visitas')),
        getDocs(collection(db, 'gastos_detalle'))
      ]);

      horasList = horasSnap.docs.map(d => ({id: d.id, ...d.data()})).filter((h: any) => otIds.has(h.orderId));
      gastosList = gastosSnap.docs.map(d => ({id: d.id, ...d.data()})).filter((g: any) => otIds.has(g.orderId));
    } catch (error) {
      console.error("Error al obtener detalles para Excel:", error);
    }

    // 2. Horas
    const horasData = horasList.map(h => {
      const parentOT = filteredData.find(ot => ot.id === h.orderId);
      return {
        'ID OT': parentOT?.numero_informe || h.orderId || '—',
        ID: h.id,
        Fecha: h.fechaStr || (h.fecha?.toDate ? format(h.fecha.toDate(), 'dd/MM/yyyy') : '—'),
        Inspector: h.inspectorNombre || h.inspectorId || '—',
        Actividad: h.actividad || '—',
        'Hora Llegada': h.horaLlegada || '—',
        'Hora Salida': h.horaSalida || '—',
        'H. Normales': h.hNormalesStr || '0',
        'H. Extras': h.hExtrasStr || '0',
        'H. Especiales': h.hEspecialesStr || '0',
        Estado: h.estado || '—'
      };
    });

    // 3. Gastos
    const gastosData = gastosList.map(g => {
      const parentOT = filteredData.find(ot => ot.id === g.orderId);
      return {
        'ID OT': parentOT?.numero_informe || g.orderId || '—',
        ID: g.id,
        Fecha: g.fechaStr || (g.fecha?.toDate ? format(g.fecha.toDate(), 'dd/MM/yyyy') : '—'),
        Inspector: g.inspectorNombre || g.inspectorId || '—',
        Rubro: g.rubro || '—',
        Concepto: g.descripcion || '—',
        Monto: g.monto || 0,
        'Forma Pago': g.forma_pago || '—',
        Estado: g.estado || '—'
      };
    });

    // 4. Informes
    const informesData = allInformes
      .filter(inf => otIds.has(inf.originalJobId) || otIds.has(inf.orderId))
      .map(r => {
        const parentOT = filteredData.find(ot => ot.id === r.originalJobId || ot.id === r.orderId);
        return {
          'ID OT': parentOT?.numero_informe || r.originalJobId || r.orderId || '—',
          ID: r.numero_informe || r.id,
          Tipo: r.formType || '—',
          Fecha: r.fecha_creacion?.toDate ? format(r.fecha_creacion.toDate(), 'dd/MM/yyyy') : '—',
          Estado: r.estado || '—',
          Inspector: (r.inspectorNombres || []).join(', ')
        };
      });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(otData.length > 0 ? otData : [{ 'Sin datos': 'No hay OTs' }]), "Resumen OTs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(horasData.length > 0 ? horasData : [{ 'Sin datos': 'No hay horas registradas' }]), "Horas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gastosData.length > 0 ? gastosData : [{ 'Sin datos': 'No hay gastos registrados' }]), "Gastos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(informesData.length > 0 ? informesData : [{ 'Sin datos': 'No hay informes' }]), "Informes");

    XLSX.writeFile(wb, `Reporte_Masivo_OTs_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  const handleFormSubmit = async (data: any) => {
    setFormLoading(true);
    try {
      const client = clients.find(c => c.id === data.clienteId);
      const inspectorNombres = data.inspectorIds.map((id: string) => inspectors.find(i => i.id === id)?.nombre || 'Inspector');
      
      const payload = {
        ...data,
        clienteNombre: client?.nombre || '',
        inspectorNombres,
        updatedAt: serverTimestamp()
      };

      if (editingJob) {
        await updateDoc(doc(db, 'ordenes_trabajo', editingJob.id), payload);
        toast({ title: "OT Actualizada", description: "Cambios guardados correctamente." });
      } else {
        const nextId = await getNextOTId(db);
        await setDoc(doc(db, 'ordenes_trabajo', nextId), {
          ...payload,
          id: nextId,
          numero_informe: nextId,
          fecha_creacion: serverTimestamp(),
          formType: 'job'
        });
        toast({ title: "Nueva OT Creada", description: `Orden ${nextId} registrada.` });
      }
      setIsModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la orden." });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteJob = async (job: any) => {
    if (!window.confirm("¿Confirmas la eliminación definitiva?")) return;
    try {
      await deleteDoc(doc(db, job.sourceCollection || 'ordenes_trabajo', job.id));
      if (job.sourceCollection === 'ordenes_trabajo') await decrementOTCounterIfLast(db, job.id);
      if (selectedOT?.id === job.id) setSelectedOT(null);
      toast({ title: "Eliminado", description: "El registro ha sido borrado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  const handleApproveJob = async (id: string, status: string, customCollection?: string) => {
    if (status === 'Aprobado') return;
    if (!window.confirm("¿Aprobar definitivamente este documento?")) return;
    try {
      const collectionName = customCollection || (activeView === 'reports' ? 'informes' : 'ordenes_trabajo');
      await updateDoc(doc(db, collectionName, id), { estado: 'Aprobado', fecha_aprobacion: serverTimestamp() });
      toast({ title: "Aprobado", description: "El registro ha sido validado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo aprobar." });
    }
  };

  const handleReprintSavedPdf = async (job: any) => {
    const finalId = job.numero_informe || job.id;
    const inspectorName = job.tecnicoNombre || job.inspectorNombres?.join(', ') || 'tecnico energy engine';
    const reportForPdf = await normalizeReportForPdf(job);
    let docPdf: any = null;

    try {
      switch (job.formType) {
        case 'hoja-trabajo': docPdf = generateHojaTrabajoPDF(reportForPdf, inspectorName, finalId); break;
        case 'informe-revision': docPdf = generateInformeRevisionPDF(reportForPdf, inspectorName, finalId); break;
        case 'informe-tecnico': docPdf = generateInformeTecnicoPDF(reportForPdf, inspectorName, finalId); break;
        case 'informe-simplificado': docPdf = generateInformeSimplificadoPDF(reportForPdf, inspectorName, finalId); break;
        case 'revision-basica': docPdf = generateRevisionBasicaPDF(reportForPdf, inspectorName, finalId); break;
        default: alert('No se soporta reimpresión para este tipo.'); return;
      }
      if (docPdf) docPdf.save(getPdfFileName(finalId));
    } catch (e) {
      toast({ variant: "destructive", title: "Error PDF", description: "No se pudo generar el archivo." });
    }
  };

  const onGenerateReport = (type: string) => {
    setSelectedReportForEdit({
      orderId: selectedOT.id,
      originalJobId: selectedOT.id,
      clienteId: selectedOT.clienteId,
      clienteNombre: selectedOT.clienteNombre || selectedOT.cliente,
      instalacion: selectedOT.direccion || selectedOT.instalacion,
      motor: selectedOT.motor,
      modelo: selectedOT.modelo,
      n_motor: selectedOT.n_motor,
      inspectorIds: selectedOT.inspectorIds,
      inspectorNombres: selectedOT.inspectorNombres,
      formType: type
    });
    setIsReportEditorOpen(true);
  };

  // UI Helpers
  const getJobTitle = (job: any) => {
    if (job.formType === 'job') return job.descripcion;
    return FORM_TYPES.find(f => f.id === job.formType)?.label || 'INFORME';
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm items-end">
        <div className="lg:col-span-2 space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Buscador Inteligente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <Input placeholder="Nº OT, Cliente, Proyecto..." value={filterQuery} onChange={e => setFilterQuery(e.target.value)} className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Inspector</Label>
          <Select value={filterInspectorId} onValueChange={setFilterInspectorId}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectItem value="all">TODOS</SelectItem>
              {inspectors.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Tipo Reporte</Label>
          <Select value={filterReportType} onValueChange={setFilterReportType}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectItem value="all">TODOS</SelectItem>
              {FORM_TYPES.map(ft => <SelectItem key={ft.id} value={ft.id}>{ft.label.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Desde</Label>
          <Input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold" />
        </div>
        <div className="flex gap-2">
          <div className="space-y-1 flex-1">
            <Label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Hasta</Label>
            <Input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold" />
          </div>
          <Button 
            variant="ghost" 
            onClick={() => { setFilterQuery(''); setFilterInspectorId('all'); setFilterReportType('all'); setFilterDateStart(''); setFilterDateEnd(''); }}
            className="h-10 rounded-xl text-slate-400 hover:text-red-500 transition-colors self-end"
          >
            Limpiar
          </Button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {activeView === 'ots' ? (
        selectedOT ? (
          <JobDetailView 
            selectedOT={selectedOT}
            setSelectedOT={setSelectedOT}
            handleEditJob={(job) => { setEditingJob(job); setIsModalOpen(true); }}
            handleEditReport={(report) => { setSelectedReportForEdit(report); setIsReportEditorOpen(true); }}
            handleDeleteJob={handleDeleteJob}
            handleApproveJob={handleApproveJob}
            handleReprintSavedPdf={handleReprintSavedPdf}
            onGenerateReport={onGenerateReport}
            relatedReports={relatedReports}
            getJobTitle={getJobTitle}
          />
        ) : (
          <JobsTable 
            jobs={filteredData}
            loading={loading}
            selectedOT={selectedOT}
            setSelectedOT={setSelectedOT}
            handleEditJob={(job) => { setEditingJob(job); setIsModalOpen(true); }}
            handleDeleteJob={handleDeleteJob}
            handleApproveJob={handleApproveJob}
            getJobTitle={getJobTitle}
          />
        )
      ) : (
        <ReportsTable 
          reports={filteredData}
          loading={loading}
          handleEditJob={(job) => { setSelectedReportForEdit(job); setIsReportEditorOpen(true); }}
          handleDeleteJob={handleDeleteJob}
          handleApproveJob={handleApproveJob}
          handleReprintSavedPdf={handleReprintSavedPdf}
          getJobTitle={getJobTitle}
        />
      )}

      {/* MODALES */}
      <JobFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingJob={editingJob}
        clients={clients}
        inspectors={inspectors}
        onSubmit={handleFormSubmit}
        formLoading={formLoading}
      />

      <ReportEditorDialog 
        isOpen={isReportEditorOpen}
        onOpenChange={setIsReportEditorOpen}
        selectedReport={selectedReportForEdit}
        aiSuggestions={aiSuggestions}
        isAiLoading={isAiLoading}
        onAnalyzeAi={async () => {
          if (!selectedReportForEdit) return;
          setIsAiLoading(true);
          try {
            const res = await suggestCorrections({ reportData: selectedReportForEdit });
            setAiSuggestions(res);
            toast({ title: "Sugerencias IA", description: "Análisis completado." });
          } catch (e) {
            toast({ variant: "destructive", title: "Error IA", description: "No se pudo conectar." });
          } finally { setIsAiLoading(false); }
        }}
        onSuccess={() => { setIsReportEditorOpen(false); setSelectedReportForEdit(null); setAiSuggestions(null); }}
      />
    </div>
  );
}