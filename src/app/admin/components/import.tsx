'use client';

import { useState } from 'react';
import { FileUp, Info, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { useFirestore } from '@/firebase';

// Definimos el tipo para el estado del proceso
type ProcessState = 'idle' | 'loading' | 'success' | 'error';

export default function ImportPage() {
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const db = useFirestore();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !db) return;

    setFileName(file.name);
    setProcessState('loading');
    setMessage('Procesando el archivo... Esto puede tardar unos segundos.');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);

          if (json.length === 0) {
            throw new Error("El archivo Excel está vacío o no tiene el formato correcto.");
          }

          // Iniciar la escritura por lotes en Firebase
          const batch = writeBatch(db);
          const jobsCollection = collection(db, 'trabajos');

          json.forEach((row: any) => {
            // Lógica para mapear las columnas del Excel a los campos del Job
            const newJob = {
              descripcion: row['Descripcion'] || 'Sin descripción',
              clienteNombre: row['Cliente'] || 'Cliente no especificado',
              // Si los inspectores vienen en una sola celda, separados por comas
              inspectorNombres: row['Inspectores'] ? row['Inspectores'].split(',').map((name: string) => name.trim()) : [],
              estado: row['Estado'] || 'Pendiente',
              // Si el excel no tiene IDs, los dejamos vacíos, Firebase los manejará
              clienteId: '', 
              inspectorIds: [],
              // Usar la fecha del Excel si existe, sino, la fecha actual
              fechaCreacion: row['Fecha'] ? new Date(row['Fecha']) : serverTimestamp(),
            };

            const jobRef = doc(jobsCollection); // Crea una referencia con un ID único
            batch.set(jobRef, newJob);
          });

          await batch.commit();
          setProcessState('success');
          setMessage(`¡Éxito! Se han importado ${json.length} trabajos desde el archivo ${file.name}.`);

        } catch (error: any) {
          console.error(error);
          setProcessState('error');
          setMessage(error.message || "Ocurrió un error desconocido al procesar el archivo.");
        }
      };

      reader.onerror = () => {
        setProcessState('error');
        setMessage("Error al leer el archivo.");
      };

      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      console.error(error);
      setProcessState('error');
      setMessage(error.message || "Ocurrió un error inesperado.");
    }
  };

  const getStatusInfo = () => {
    switch (processState) {
      case 'loading':
        return { icon: Loader2, color: 'text-blue-500', spin: true, title: 'Procesando...' };
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', spin: false, title: 'Completado' };
      case 'error':
        return { icon: AlertTriangle, color: 'text-red-500', spin: false, title: 'Error' };
      default:
        return null;
    }
  }

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-8 text-slate-900">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Importar Datos desde Excel</h1>
        <p className="text-slate-500 mt-1">
          Sube un archivo Excel (.xlsx, .xls, .csv) para cargar trabajos históricos a la base de datos.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm">
        {processState === 'idle' ? (
          <div className="border-2 border-dashed border-slate-300 hover:border-primary transition-colors rounded-lg p-8">
            <div className="text-center">
              <FileUp className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-lg font-medium text-slate-800">Selecciona un archivo para subir</h3>
              <div className="mt-6">
                <label htmlFor="file-upload" className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors">
                  <span>Cargar Archivo</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls, .csv" />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {statusInfo && <statusInfo.icon className={`mx-auto h-12 w-12 ${statusInfo.color} ${statusInfo.spin ? 'animate-spin' : ''}`} />}
            <h3 className="mt-4 text-xl font-bold text-slate-800">{statusInfo?.title}</h3>
            <p className="mt-2 text-slate-600">{message}</p>
            {processState !== 'loading' && (
                 <button onClick={() => { setProcessState('idle'); setFileName(''); }} className="mt-6 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors">
                    Cargar otro archivo
                </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <Info className="h-5 w-5 text-blue-700" />
          </div>
          <div className="ml-3">
            <h4 className="font-bold text-blue-800">Estructura del Archivo Excel</h4>
            <p className="text-sm text-blue-700 mt-1">
              Para que la importación funcione, tu archivo debe tener una hoja con las siguientes columnas: <strong>Cliente, Descripcion, Estado, Fecha, Inspectores</strong>. Los nombres de las columnas deben coincidir exactamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
