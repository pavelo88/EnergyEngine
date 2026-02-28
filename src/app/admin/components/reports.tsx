'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';

// Interfaz actualizada para coincidir con los datos de la colección 'trabajos'
interface Job {
  id: string;
  clienteNombre: string;
  estado: string;
  fechaCreacion: any; // Puede ser un Timestamp de Firebase
}

export default function ReportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!db) return;
    const fetchCompletedJobs = async () => {
      try {
        setLoading(true);
        // Corregido: Query a 'trabajos' y filtrado por 'estado' y 'Completado'
        const q = query(collection(db, 'trabajos'), where('estado', '==', 'Completado'));
        const querySnapshot = await getDocs(q);
        
        const completedJobs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];

        setJobs(completedJobs);
        setError(null);
      } catch (err) {
        console.error("Error fetching completed jobs: ", err);
        setError('No se pudieron cargar los trabajos completados. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedJobs();
  }, [db]);

  return (
    <div className="p-6 h-full bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Informes de Inspección</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-20">
            <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-20 text-red-600">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p className='text-center'>{error}</p>
          </div>
        ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                <FileText className="h-12 w-12 mb-4" />
                <p className='text-center'>No hay trabajos completados pendientes de informe.</p>
            </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID Trabajo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Generar</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {jobs.map((job) => (
                <tr key={job.id}>
                  {/* Corregido: Usar job.id en lugar de job.jobId */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{job.id}</td>
                  {/* Corregido: Usar job.clienteNombre en lugar de job.clientName */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{job.clienteNombre}</td>
                  {/* Corregido: Usar y formatear job.fechaCreacion */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{job.fechaCreacion?.toDate().toLocaleDateString() || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Corregido: Usar job.estado en lugar de job.status */}
                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {job.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                      Generar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
