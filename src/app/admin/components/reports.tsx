'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, FileText, AlertTriangle, Printer, Download, MapPin } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAdminHeader } from './AdminHeaderContext';
import { formatSafeDate } from '@/lib/utils';

// Importar las funciones de generación de PDF de cada formulario
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTrabajoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';

interface Report {
  id: string;
  cliente: string;
  clienteNombre?: string;
  instalacion?: string;
  location?: { lat: number, lon: number };
  modelo?: string;
  n_motor?: string;
  fecha_creacion: any; 
  formType: 'hoja-trabajo' | 'informe-revision' | 'informe-tecnico' | 'revision-basica' | 'informe-simplificado' | 'job' | undefined;
  tecnicoNombre?: string;
  inspectorNombres?: string[];
  [key: string]: any; 
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useFirestore();

  const handleExport = () => {
    const dataToExport = reports.map((report: Report) => {
      let fecha: string = formatSafeDate(report.fecha_creacion);
      
      return {
        ID: report.id,
        Tipo: report.formType?.toUpperCase() || 'GENERAL',
        Cliente: report.cliente || report.clienteNombre,
        Ubicación: report.instalacion || '-',
        Técnico: report.tecnicoNombre || report.inspectorNombres?.join(', '),
        Fecha: fecha,
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Informes");
    XLSX.writeFile(workbook, `EnergyEngine_Informes_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  useAdminHeader('Historial Maestro de Informes', (
    <Button onClick={handleExport} variant="outline" className="rounded-xl font-bold uppercase text-xs tracking-widest border-slate-200 shadow-sm active:scale-95 transition-all">
        <Download className="mr-2" size={16} />
        Exportar Historial
    </Button>
  ));

  useEffect(() => {
    if (!db) return;
    const fetchAllReports = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'informes'), orderBy('fecha_creacion', 'desc'), limit(100));
        const querySnapshot = await getDocs(q);
        const allDocs = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Report[];
        setReports(allDocs);
        setError(null);
      } catch (err) {
        console.error("Error al cargar informes maestros:", err);
        setError('Error en la carga de informes desde Firestore.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllReports();
  }, [db]);

  const handleReprintPDF = (report: Report) => {
    let doc: jsPDF | null = null;
    const inspectorName = report.tecnicoNombre || report.inspectorNombres?.join(', ') || 'técnico energy engine';
    try {
        switch(report.formType) {
            case 'hoja-trabajo': doc = generateHojaTrabajoPDF(report, inspectorName, report.id); break;
            case 'informe-revision': doc = generateInformeRevisionPDF(report, inspectorName, report.id); break;
            case 'informe-tecnico': doc = generateInformeTecnicoPDF(report, inspectorName, report.id); break;
            case 'informe-simplificado': doc = generateInformeSimplificadoPDF(report, inspectorName, report.id); break;
            default: alert('El formato de este documento no soporta reimpresión automática.'); return;
        }
        if (doc) doc.save(`Informe_${report.id}.pdf`);
    } catch (e) {
        console.error("Error al reimprimir PDF maestro:", e);
    }
  };
  
  const getReportTitle = (formType: Report['formType']) => {
    switch(formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        default: return 'Registro Técnico';
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sincronizando Archivo Maestro...</span>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-2">
            <AlertTriangle className="mx-auto text-red-500" size={40}/>
            <p className='text-red-500 font-bold uppercase text-xs'>{error}</p>
          </div>
        ) : reports.length === 0 ? (
            <p className='text-center text-slate-400 font-bold uppercase text-xs py-20'>No hay documentos registrados en el sistema.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="pb-4">Documento / ID</th>
                <th className="pb-4">Cliente / Instalación</th>
                <th className="pb-4">Equipo / Modelo</th>
                <th className="pb-4">Inspector</th>
                <th className="pb-4">Fecha Registro</th>
                <th className="pb-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reports.map((report: Report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4">
                      <div className="font-black text-slate-700 text-sm uppercase tracking-tight">{getReportTitle(report.formType)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{report.id}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-sm font-bold text-slate-600 uppercase">{report.cliente || report.clienteNombre}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{report.instalacion || '-'}</div>
                  </td>
                  <td className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {report.modelo && <div>MOD: {report.modelo}</div>}
                      {report.n_motor && <div className="text-primary/60">S/N: {report.n_motor}</div>}
                  </td>
                  <td className="py-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{report.tecnicoNombre || report.inspectorNombres?.join(', ')}</div>
                  </td>
                  <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {formatSafeDate(report.fecha_creacion, 'dd/MM/yyyy')}
                  </td>
                  <td className="py-4 text-right">
                    <button 
                      onClick={() => handleReprintPDF(report)} 
                      className="bg-slate-900 hover:bg-primary text-white font-black py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] ml-auto shadow-lg shadow-slate-200 active:scale-95"
                    >
                      <Printer size={14} />
                      PDF
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
