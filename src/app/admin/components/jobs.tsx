'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { PlusCircle, Loader2, Pencil, Trash2, Download, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// --- Tipos de Datos ---
type Inspector = { id: string; nombre: string; };
type Cliente = { id: string; nombre: string; };
type Job = {
  id: string;
  descripcion: string;
  clienteId: string;
  clienteNombre?: string;
  cliente?: string; // from reports
  instalacion?: string;
  location?: { lat: number, lon: number };
  modelo?: string;
  n_motor?: string;
  inspectorIds: string[];
  inspectorNombres?: string[];
  tecnicoNombre?: string; // from reports
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  fechaCreacion?: any;
  fecha_guardado?: any; // from reports
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
  const db = useFirestore();

  // --- Carga de Datos (Jobs, Inspectores, Clientes) ---
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
    
    // CORRECCIÓN: Se quita el filtro para mostrar todos los trabajos, incluidos los informes.
    const qJobs = query(collection(db, 'trabajos'));

    const unsubJobs = onSnapshot(qJobs, snapshot => {
      const jobList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Job, 'id'>)
      }));
      
      // Ordenar por fecha, manejando ambos campos posibles
      jobList.sort((a, b) => {
        const dateA = a.fechaCreacion?.toDate() || a.fecha_guardado?.toDate() || 0;
        const dateB = b.fechaCreacion?.toDate() || b.fecha_guardado?.toDate() || 0;
        if (dateA === 0 && dateB === 0) return 0;
        if (dateA === 0) return 1;
        if (dateB === 0) return -1;
        return dateB - dateA; // Descending
      });

      setJobs(jobList);
      setLoading(false);
    }, (error) => {
        console.error("Error al cargar trabajos: ", error);
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
    } else {
      setSelectedInspectorIds([]);
    }
  }, [editingJob]);


  // --- Manejo del Formulario (Añadir/Editar) ---
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const clienteId = formData.get('clienteId') as string;
    const selectedClient = clients.find(c => c.id === clienteId);
    
    const selectedInspectors = inspectors.filter(i => selectedInspectorIds.includes(i.id));

    const jobData = {
      descripcion: formData.get('descripcion') as string,
      clienteId: clienteId,
      clienteNombre: selectedClient?.nombre || 'N/A',
      inspectorIds: selectedInspectorIds,
      inspectorNombres: selectedInspectors.map(i => i.nombre),
      estado: formData.get('estado') as Job['estado'],
      formType: 'job', // Marcamos este documento como un trabajo manual
    };

    try {
      if (editingJob) {
        const jobRef = doc(db, 'trabajos', editingJob.id);
        await updateDoc(jobRef, jobData);
        alert('Trabajo actualizado correctamente.');
      } else {
        await addDoc(collection(db, "trabajos"), {
          ...jobData,
          fechaCreacion: serverTimestamp(),
        });
        alert('Nuevo trabajo creado.');
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el trabajo: ", error);
      alert("Error al guardar el trabajo. Revisa la consola.");
    }
    setFormLoading(false);
  };
  
  const handleInspectorSelection = (inspectorId: string) => {
    setSelectedInspectorIds(prev => 
      prev.includes(inspectorId)
        ? prev.filter(id => id !== inspectorId)
        : [...prev, inspectorId]
    );
  };


  // --- Acciones de la Tabla ---
  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm("¿Seguro que quieres eliminar este trabajo?")) {
      try {
        await deleteDoc(doc(db, 'trabajos', jobId));
        alert("Trabajo eliminado.");
      } catch (error) {
        console.error("Error al eliminar el trabajo: ", error);
        alert("Error al eliminar. Revisa la consola.");
      }
    }
  };
  
  const getJobTitle = (job: Job) => {
    if (job.formType === 'job') {
        return job.descripcion;
    }
    switch(job.formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        default: return job.descripcion || `Documento ${job.id}`;
    }
  };

  const handleExport = () => {
    const dataToExport = jobs.map(job => ({
      ID: job.id,
      Descripción: getJobTitle(job),
      Cliente: job.clienteNombre || job.cliente,
      Instalación: job.instalacion || 'N/A',
      Inspectores: (job.inspectorNombres || [job.tecnicoNombre]).join(', '),
      Estado: job.estado,
      Fecha: job.fecha_guardado?.toDate()?.toLocaleDateString() || job.fechaCreacion?.toDate()?.toLocaleDateString() || 'N/A',
      Modelo: job.modelo || 'N/A',
      "Nº Motor/Serie": job.n_motor || 'N/A',
      Ubicación: job.location ? `${job.location.lat.toFixed(5)}, ${job.location.lon.toFixed(5)}` : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trabajos");
    XLSX.writeFile(workbook, `Reporte_Trabajos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const openModalForEdit = (job: Job) => {
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const openModalForAdd = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingJob(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Trabajos</h1>
            <p className="mt-1 text-slate-600">Crea, asigna y gestiona los trabajos de los inspectores.</p>
        </div>
        <div className="flex items-center gap-4">
            <Button onClick={handleExport} variant="outline">
                <Download className="mr-2" size={16} />
                Exportar a Excel
            </Button>
            <Button onClick={openModalForAdd}>
            <PlusCircle className="mr-2" size={20} />
            <span>Crear Nuevo Trabajo</span>
            </Button>
        </div>
      </div>

      {/* --- Tabla de Trabajos --*/}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          {loading ? <p>Cargando trabajos...</p> : (
            <table className="w-full text-left">
              <thead><tr className="border-b"><th className="p-3">Descripción</th><th className="p-3">Cliente / Instalación</th><th className="p-3">Equipo</th><th className="p-3">Inspectores</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{getJobTitle(job)}</td>
                    <td className="p-3">{job.clienteNombre || job.cliente}<br/><span className="text-xs text-slate-500">{job.instalacion || ''}</span></td>
                    <td className="p-3 text-xs">
                        {job.modelo && <div><b>Modelo:</b> {job.modelo}</div>}
                        {job.n_motor && <div><b>S/N:</b> {job.n_motor}</div>}
                        {job.location && <div className="flex items-center gap-1 mt-1"><MapPin size={12} className="text-slate-400"/> {job.location.lat.toFixed(4)}, {job.location.lon.toFixed(4)}</div>}
                    </td>
                    <td className="p-3">{(job.inspectorNombres || [job.tecnicoNombre]).join(', ')}</td>
                    <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                          ${job.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${job.estado === 'En Progreso' ? 'bg-indigo-100 text-indigo-800' : ''}
                          ${job.estado === 'Completado' ? 'bg-green-100 text-green-800' : ''}`}>
                          {job.estado}
                        </span>
                    </td>
                    <td className="p-3 flex items-center gap-4">
                        <button onClick={() => openModalForEdit(job)} className="text-slate-500 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed" disabled={job.formType !== 'job'}><Pencil size={18}/></button>
                        <button onClick={() => handleDeleteJob(job.id)} className="text-slate-500 hover:text-red-600"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                 {jobs.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-slate-500">No hay trabajos creados todavía.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- Modal de Añadir/Editar Trabajo --*/}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{editingJob ? 'Editar Trabajo' : 'Crear Nuevo Trabajo'}</h2>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-5">
              
              <textarea required rows={3} className="p-3 border rounded-lg bg-white" name="descripcion" placeholder="Descripción del trabajo..." defaultValue={editingJob?.descripcion || ''}></textarea>
              
              <select required className="p-3 border rounded-lg bg-white" name="clienteId" defaultValue={editingJob?.clienteId || ''}>
                <option value="" disabled>Seleccionar cliente...</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.nombre}</option>)}
              </select>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Asignar Inspectores</label>
                <div className="max-h-40 overflow-y-auto space-y-2 p-3 border rounded-lg bg-slate-50">
                  {inspectors.map(inspector => (
                    <div key={inspector.id} className="flex items-center">
                      <Checkbox
                        id={`inspector-${inspector.id}`}
                        checked={selectedInspectorIds.includes(inspector.id)}
                        onCheckedChange={() => handleInspectorSelection(inspector.id)}
                      />
                      <Label htmlFor={`inspector-${inspector.id}`} className="ml-2 text-sm font-medium text-slate-700">
                        {inspector.nombre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <select required className="p-3 border rounded-lg bg-white" name="estado" defaultValue={editingJob?.estado || 'Pendiente'}>
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completado">Completado</option>
              </select>

              <div className="flex justify-end gap-4 mt-4">
                <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="animate-spin" size={18}/>}
                  {formLoading ? 'Guardando...' : 'Guardar Trabajo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
