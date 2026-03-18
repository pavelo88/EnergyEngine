'use client';

import { useState } from 'react';
import { FileUp, Info, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { useFirestore } from '@/firebase';
import { useAdminHeader } from './AdminHeaderContext';

type ProcessState = 'idle' | 'loading' | 'success' | 'error';

export default function ImportPage() {
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [message, setMessage] = useState('');
  const db = useFirestore();

  useAdminHeader('Importar Datos Excel');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !db) return;

    setProcessState('loading');
    setMessage('Procesando archivo...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

          if (json.length === 0) throw new Error("Archivo vacío.");

          const batch = writeBatch(db);
          const jobsCollection = collection(db, 'ordenes_trabajo');

          json.forEach((row: any) => {
            const newJob = {
              descripcion: row['Descripcion'] || 'Sin descripción',
              clienteNombre: row['Cliente'] || 'Cliente no especificado',
              inspectorNombres: row['Inspectores'] ? row['Inspectores'].split(',').map((name: string) => name.trim()) : [],
              estado: row['Estado'] || 'Pendiente',
              clienteId: '', 
              inspectorIds: [],
              fechaCreacion: row['Fecha'] ? new Date(row['Fecha']) : serverTimestamp(),
            };
            batch.set(doc(jobsCollection), newJob);
          });

          await batch.commit();
          setProcessState('success');
          setMessage(`Importación completada: ${json.length} registros.`);
        } catch (error: any) {
          setProcessState('error');
          setMessage(error.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      setProcessState('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
        {processState === 'idle' ? (
          <div className="border-2 border-dashed border-slate-200 hover:border-primary transition-all rounded-[2rem] p-12 group cursor-pointer relative">
            <FileUp className="mx-auto h-16 w-16 text-slate-300 group-hover:text-primary transition-colors" />
            <h3 className="mt-4 text-lg font-black text-slate-800 uppercase tracking-tighter">Subir archivo de datos</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Formatos aceptados: .XLSX, .XLS, .CSV</p>
            <input id="file-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
          </div>
        ) : (
          <div className="py-10 animate-in zoom-in duration-300">
            {processState === 'loading' ? <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" /> : processState === 'success' ? <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" /> : <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />}
            <h3 className="mt-6 text-2xl font-black text-slate-800 uppercase tracking-tighter">{processState === 'loading' ? 'Procesando...' : processState === 'success' ? 'Éxito' : 'Error'}</h3>
            <p className="mt-2 text-slate-500 font-bold uppercase text-xs tracking-widest">{message}</p>
            {processState !== 'loading' && (
                 <button onClick={() => setProcessState('idle')} className="mt-8 bg-slate-900 text-white font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all">Nueva Carga</button>
            )}
          </div>
        )}
      </div>

      <div className="bg-primary/5 border border-primary/10 p-6 rounded-2xl flex gap-4 items-start">
        <Info className="h-6 w-6 text-primary flex-shrink-0" />
        <div>
          <h4 className="font-black text-primary uppercase text-xs tracking-widest mb-1">Estructura requerida</h4>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Para una importación exitosa, asegúrese de que el Excel contenga las siguientes columnas exactas: <span className="font-bold text-slate-800">Cliente, Descripcion, Estado, Fecha, Inspectores</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
