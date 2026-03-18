'use client';

import { useState } from 'react';
import { 
  FileText, 
  Settings, 
  ClipboardCheck,
  HardDrive,
  Loader2,
  ArrowRight,
  Wrench,
  Smartphone,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

type ReportType = 'hoja-trabajo' | 'informe-tecnico' | 'informe-revision' | 'informe-simplificado';

export default function InspectionHub({ 
  onSelectInspectionType,
  onInstall,
  canInstall,
  isStandalone,
  hasPin
}: { 
  onSelectInspectionType: (type: ReportType, data?: any) => void;
  onInstall?: () => void;
  canInstall?: boolean;
  isStandalone?: boolean;
  hasPin?: boolean;
}) {
  const [inspectionId, setInspectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const db = useFirestore();

  const reportTypes = [
    { id: 'hoja-trabajo' as ReportType, title: 'Hoja de Trabajo', icon: FileText, desc: 'Registro de materiales y servicios' },
    { id: 'informe-tecnico' as ReportType, title: 'Informe Técnico', icon: Settings, desc: 'Reporte detallado de intervenciones' },
    { id: 'informe-revision' as ReportType, title: 'Informe de Revisión', icon: ClipboardCheck, desc: 'Checklist completo de mantenimiento' },
    { id: 'informe-simplificado' as ReportType, title: 'Informe Simplificado', icon: Wrench, desc: 'Para equipos sin checklist (ej. motobombas)' },
  ];

  const handleLoadInspection = async (type: ReportType) => {
    if (!inspectionId.trim() || !db) {
      onSelectInspectionType(type);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const docRef = doc(db, 'informes', inspectionId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        onSelectInspectionType(type, { id: docSnap.id, ...docSnap.data() });
      } else {
        setError('No se encontró el trabajo ID: ' + inspectionId);
        onSelectInspectionType(type, null);
      }
    } catch (e: any) {
      console.error(e);
      setError('Error al cargar datos');
      onSelectInspectionType(type, null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl mx-auto">
      
      {/* Sección para cargar datos previos */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
        <h2 className="font-black text-slate-900 flex items-center gap-2 uppercase text-sm tracking-tighter">
          <HardDrive size={18} className="text-primary" />
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
            placeholder="Ej: HT-24-1234" 
            className="flex-grow p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-primary"
          />
          {loading && <Loader2 className="animate-spin text-primary self-center" />}
        </div>
        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
      </section>

      {/* Sección para crear un nuevo informe */}
      <section className="space-y-6">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 text-center">Selecciona tipo de informe</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
          {reportTypes.map(type => (
            <button 
              key={type.id}
              onClick={() => handleLoadInspection(type.id)}
              className="relative bg-white p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100 flex flex-col text-center justify-center items-center gap-4 md:gap-6 group active:scale-[0.98] transition-all hover:border-primary/50 hover:shadow-2xl h-56 sm:h-64 md:h-80"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 text-primary rounded-[1.5rem] md:rounded-[2rem] flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110">
                <type.icon size={32} className="md:hidden" />
                <type.icon size={40} className="hidden md:block" />
              </div>
              <div className="space-y-1 md:space-y-2">
                <h3 className="font-black text-slate-900 tracking-tight text-lg md:text-2xl">{type.title}</h3>
                <p className="text-xs md:text-sm text-slate-500 max-w-[200px] mx-auto leading-relaxed">{type.desc}</p>
              </div>
              <ArrowRight className="text-slate-200 group-hover:text-primary transition-colors absolute top-6 right-6 md:top-8 md:right-8" size={24}/>
            </button>
          ))}
        </div>
      </section>

      {/* INSTALAR COMO APP */}
      <section className="pt-2">
        {isStandalone ? (
          <div className="w-full h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-sm">
            <CheckCircle2 size={24} />
            <div className="text-left">
              <p className="text-sm font-black text-emerald-700">APP INSTALADA ✓</p>
              <p className="text-[9px] text-emerald-600/70 font-bold uppercase tracking-widest">Estás usando la versión nativa</p>
            </div>
          </div>
        ) : (
          <button 
            onClick={onInstall}
            disabled={!hasPin || !canInstall}
            className={cn(
               "w-full h-20 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95",
               !hasPin || !canInstall 
                 ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                 : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              !hasPin || !canInstall ? "bg-slate-200 text-slate-400" : "bg-primary/20 text-primary"
            )}>
              <Smartphone size={20} />
            </div>
            <div className="text-left text-xs">
              <p className="font-black uppercase tracking-tighter">
                {!hasPin ? 'Configura PIN para instalar' : !canInstall ? 'Instalación no disponible' : 'Instalar energy engine'}
              </p>
              <p className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                !hasPin || !canInstall ? "text-slate-400" : "text-white/50"
              )}>
                {!hasPin ? 'Paso de seguridad obligatorio' : !canInstall ? 'Usa Chrome/Edge para instalar' : 'Para informes offline'}
              </p>
            </div>
          </button>
        )}
      </section>
    </div>
  );
}

