'use client';

import { useState } from 'react';
import { FileText, ShieldCheck, Clipboard, File, HardDrive, ArrowRight, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

// --- PROPS DE LA INTERFAZ ---
interface HubProps {
  onSelectInspectionType: (type: 'albaran' | 'informe-trabajo' | 'hoja-revision' | 'revision-basica', data?: any) => void;
}

const reportTypes = [
  {
    id: 'albaran',
    title: 'Albarán de Trabajo',
    desc: 'Documento para firma del cliente con el resumen de la intervención.',
    icon: FileText,
  },
  {
    id: 'informe-trabajo',
    title: 'Informe de Trabajo',
    desc: 'Reporte técnico detallado con mediciones y observaciones.',
    icon: ShieldCheck,
  },
  {
    id: 'hoja-revision',
    title: 'Hoja de Revisión',
    desc: 'Checklist completo para uso interno y auditorías.',
    icon: Clipboard,
  },
  {
    id: 'revision-basica',
    title: 'Revisión Básica',
    desc: 'Versión reducida para motores pequeños sin componentes complejos.',
    icon: File,
  },
];

export default function InspectionHub({ onSelectInspectionType }: HubProps) {
  const [inspectionId, setInspectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const db = useFirestore();

  const handleLoadInspection = async (type) => {
    if (!inspectionId.trim() || !db) {
      onSelectInspectionType(type, null);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const docRef = doc(db, 'trabajos', inspectionId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onSelectInspectionType(type, docSnap.data());
      } else {
        setError('No se encontró ninguna inspección con ese ID.');
      }
    } catch (e) {
      console.error(e);
      setError('Error al buscar la inspección.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl mx-auto">
      
      {/* Sección para cargar datos previos */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <h2 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
          <HardDrive size={18} className="text-blue-500" />
          Llenado Inteligente (Opcional)
        </h2>
        <p className="text-sm text-slate-500">
          Introduce el ID de una inspección o trabajo previo para autocompletar los datos del cliente y del equipo.
        </p>
        <div className="flex gap-3">
          <input 
            value={inspectionId}
            onChange={(e) => setInspectionId(e.target.value)}
            type="text" 
            placeholder="Ej: TEC-123456" 
            className="flex-grow p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && <Loader2 className="animate-spin text-blue-500" />}
        </div>
        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
      </section>

      {/* Sección para crear un nuevo informe */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">O crea un nuevo documento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map(type => (
            <button 
              key={type.id}
              onClick={() => handleLoadInspection(type.id)}
              className="relative bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col text-center justify-center items-center gap-4 group active:scale-[0.98] transition-all hover:border-blue-500/50 hover:shadow-lg md:h-64"
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110">
                <type.icon size={32} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 tracking-tight text-xl">{type.title}</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-[250px] mx-auto">{type.desc}</p>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors absolute top-6 right-6" size={24}/>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
