'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { PlusCircle, Loader2, Pencil, Trash2, Download, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { useAdminHeader } from './AdminHeaderContext';

type Inspector = { id: string; nombre: string; };
type Cliente = { id: string; nombre: string; };
type Job = {
  id: string;
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
  formType?: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedInspectorIds, setSelectedInspectorIds] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Job['estado']>('Pendiente');
  const db = useFirestore();

  const openModalForAdd = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const dataToExport = jobs.map(job => ({
      ID: job.id,
      Descripción: job.descripcion,
      Cliente: job.clienteNombre || job.cliente,
      Estado: job.estado,
      Fecha: job.fecha_creacion?.toDate()?.toLocaleDateString() || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trabajos");
    XLSX.writeFile(workbook, `Reporte_Trabajos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  useAdminHeader('Gestión de Trabajos', (
    <div className="flex gap-2">
        <Button onClick={handleExport} variant="outline" className="rounded-xl font-bold uppercase text-xs tracking-widest hidden md:flex border-slate-200">
            <Download className="mr-2" size={16} />
            Exportar Excel
        </Button>
        <Button onClick={openModalForAdd} className="rounded-xl font-black uppercase text-xs tracking-widest bg-primary">
            <PlusCircle className="mr-2" size={16} />
            Nuevo Trabajo
        </Button>
    </div>
  ));

  useEffect(() => {
    if (!db) return;
    const qInspectors = query(collection(db, 'usuarios'));
    const unsubInspectors = onSnapshot(qInspectors, snapshot => {
      const inspectorList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => user.roles && user.roles.includes('inspector'));
      setInspectors(inspectorList.map((user: any) => ({ id: user.id, nombre: user.nombre })));
    });

    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));
    });
    
    const qJobs = query(collection(db, 'trabajos'), orderBy('fecha_creacion', 'desc'));
    const unsubJobs = onSnapshot(qJobs, snapshot => {
      const jobList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Job, 'id'>)
      }));
      setJobs(jobList);
      setLoading(false);
    });

    return () => {
      unsubInspectors();
      unsubClients();
      unsubJobs();
    };
  }, [db]);
  
  useEffect(() => {
    if (editingJob) {
      setSelectedInspectorIds(editingJob.inspectorIds || []);
      setSelectedClientId(editingJob.clienteId || '');
      setSelectedStatus(editingJob.estado || 'Pendiente');
    } else {
      setSelectedInspectorIds([]);
      setSelectedClientId('');
      setSelectedStatus('Pendiente');
    }
  }, [editingJob]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const selectedClient = clients.find(c => c.id === selectedClientId);
    const selectedInspectors = inspectors.filter(i => selectedInspectorIds.includes(i.id));

    const jobData = {
      descripcion: formData.get('descripcion') as string,
      clienteId: selectedClientId,
      clienteNombre: selectedClient?.nombre || 'N/A',
      inspectorIds: selectedInspectorIds,
      inspectorNombres: selectedInspectors.map(i => i.nombre),
      estado: selectedStatus,
      formType: 'job',
    };

    try {
      if (editingJob) {
        await updateDoc(doc(db, 'trabajos', editingJob.id), jobData);
      } else {
        await addDoc(collection(db, "trabajos"), { ...jobData, fecha_creacion: serverTimestamp() });
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el trabajo: ", error);
    }
    setFormLoading(false);
  };
  
  const handleInspectorSelection = (inspectorId: string) => {
    setSelectedInspectorIds(prev => prev.includes(inspectorId) ? prev.filter(id => id !== inspectorId) : [...prev, inspectorId]);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este trabajo?")) {
      try {
        await deleteDoc(doc(db, 'trabajos', jobId));
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

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-x-auto">
          {loading ? <p className="text-center font-black uppercase text-slate-200">Cargando Trabajos...</p> : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
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
                          <button onClick={() => setEditingJob(job) || setIsModalOpen(true)} className="p-2 text-slate-300 hover:text-primary transition-colors disabled:opacity-30" disabled={job.formType !== 'job'}><Pencil size={18}/></button>
                          <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                        </div>
                    </td>
                  </tr>
                ))}
                 {jobs.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No se registran trabajos en el sistema.</td></tr>
                )}
              </tbody>
            </table>
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">{editingJob ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}</h2>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="descripcion" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción de Tarea</Label>
                    <Textarea required id="descripcion" name="descripcion" placeholder="Describe brevemente el trabajo a realizar..." defaultValue={editingJob?.descripcion || ''} className="rounded-xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold min-h-[100px]" />
                </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Cliente</Label>
                    <Select required value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold h-12"><SelectValue placeholder="Seleccionar de la base..." /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">{clients.map(client => <SelectItem key={client.id} value={client.id}>{client.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignación de Técnicos</Label>
                <div className="max-h-40 overflow-y-auto space-y-3 p-4 border border-slate-100 rounded-xl bg-slate-50">
                  {inspectors.map(inspector => (
                    <div key={inspector.id} className="flex items-center gap-3">
                      <Checkbox id={`inspector-${inspector.id}`} checked={selectedInspectorIds.includes(inspector.id)} onCheckedChange={() => handleInspectorSelection(inspector.id)} className="rounded-md data-[state=checked]:bg-primary" />
                      <Label htmlFor={`inspector-${inspector.id}`} className="text-xs font-black text-slate-600 uppercase tracking-tighter cursor-pointer">{inspector.nombre}</Label>
                    </div>
                  ))}
                </div>
              </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado Operativo</Label>
                     <Select required value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                        <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 font-bold h-12"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                            <SelectItem value="Pendiente">Pendiente</SelectItem>
                            <SelectItem value="En Progreso">En Progreso</SelectItem>
                            <SelectItem value="Completado">Completado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={closeModal} className="px-6 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
                <Button type="submit" disabled={formLoading} className="rounded-xl font-black uppercase text-xs tracking-widest bg-primary px-8">
                  {formLoading ? 'Procesando...' : 'Confirmar Orden'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
