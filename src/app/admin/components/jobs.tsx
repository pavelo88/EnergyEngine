'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { PlusCircle, Loader2, Pencil, Trash2 } from 'lucide-react';

// --- Tipos de Datos ---
type Inspector = { id: string; nombre: string; };
type Cliente = { id: string; nombre: string; };
type Job = {
  id: string;
  descripcion: string;
  clienteId: string;
  clienteNombre: string;
  inspectorIds: string[];
  inspectorNombres: string[];
  estado: 'Pendiente' | 'En Progreso' | 'Completado';
  fechaCreacion: any;
  formType?: string; // Campo opcional para diferenciar trabajos de informes
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const db = useFirestore();

  // --- Carga de Datos (Jobs, Inspectores, Clientes) ---
  useEffect(() => {
    if (!db) return;
    // Cargar Inspectores (usuarios con rol 'inspector')
    const qInspectors = query(collection(db, 'usuarios'), where("rol", "==", "inspector"));
    const unsubInspectors = onSnapshot(qInspectors, snapshot => {
      setInspectors(snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));
    });

    // Cargar Clientes
    const unsubClients = onSnapshot(collection(db, 'clientes'), snapshot => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre })));
    });
    
    // Cargar solo los documentos que son "trabajos" manuales (no tienen formType o es 'job')
    const qJobs = query(collection(db, 'trabajos'), where('formType', 'not-in', ['albaran', 'hoja-revision', 'informe-tecnico', 'revision-basica']));
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

  // --- Manejo del Formulario (Añadir/Editar) ---
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const clienteId = formData.get('clienteId') as string;
    const selectedClient = clients.find(c => c.id === clienteId);

    // Permitir selección múltiple de inspectores
    const inspectorIds = Array.from(formData.getAll('inspectorIds')) as string[];
    const selectedInspectors = inspectors.filter(i => inspectorIds.includes(i.id));

    const jobData = {
      descripcion: formData.get('descripcion') as string,
      clienteId: clienteId,
      clienteNombre: selectedClient?.nombre || 'N/A',
      inspectorIds: inspectorIds,
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
    <div className="space-y-8 text-slate-900">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Gestión de Trabajos</h1>
        <button
          onClick={openModalForAdd}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          <PlusCircle size={20} />
          Crear Nuevo Trabajo
        </button>
      </div>

      {/* --- Tabla de Trabajos --*/}
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="overflow-x-auto">
          {loading ? <p>Cargando trabajos...</p> : (
            <table className="w-full text-left">
              <thead><tr className="border-b"><th className="p-3">Descripción</th><th className="p-3">Cliente</th><th className="p-3">Inspectores</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{job.descripcion}</td>
                    <td className="p-3">{job.clienteNombre}</td>
                    <td className="p-3">{(job.inspectorNombres || []).join(', ')}</td>
                    <td className="p-3">{job.estado}</td>
                    <td className="p-3 flex items-center gap-4">
                        <button onClick={() => openModalForEdit(job)} className="text-slate-500 hover:text-amber-600"><Pencil size={18}/></button>
                        <button onClick={() => handleDeleteJob(job.id)} className="text-slate-500 hover:text-red-600"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
                 {jobs.length === 0 && (
                    <tr><td colSpan={5} className="p-4 text-center text-slate-500">No hay trabajos creados todavía.</td></tr>
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
                <label className="block text-sm font-medium text-slate-600 mb-1">Asignar Inspectores</label>
                <select multiple required className="p-3 border rounded-lg bg-white w-full h-32" name="inspectorIds" defaultValue={editingJob?.inspectorIds || []}>
                  {inspectors.map(inspector => <option key={inspector.id} value={inspector.id}>{inspector.nombre}</option>)}
                </select>
              </div>

              <select required className="p-3 border rounded-lg bg-white" name="estado" defaultValue={editingJob?.estado || 'Pendiente'}>
                <option value="Pendiente">Pendiente</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completado">Completado</option>
              </select>

              <div className="flex justify-end gap-4 mt-4">
                <button type="button" onClick={closeModal} className="text-slate-600 font-bold py-2 px-4 rounded-lg">Cancelar</button>
                <button type="submit" disabled={formLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                  {formLoading && <Loader2 className="animate-spin" size={18}/>}
                  {formLoading ? 'Guardando...' : 'Guardar Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
