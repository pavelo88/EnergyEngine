'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, FileText, AlertTriangle, Printer, Download, MapPin } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAdminHeader } from './AdminHeaderContext';

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
    const dataToExport = reports.map(report => ({
      ID: report.id,
      Tipo: report.formType,
      Cliente: report.cliente || report.clienteNombre,
      Fecha: report.fecha_creacion?.toDate()?.toLocaleDateString() || 'N/A',
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informes");
    XLSX.writeFile(workbook, `Reporte_Informes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  useAdminHeader('Historial de Informes', (
    <Button onClick={handleExport} variant="outline" className="rounded-xl font-bold uppercase text-xs tracking-widest border-slate-200">
        <Download className="mr-2" size={16} />
        Exportar Historial
    </Button>
  ));

  useEffect(() => {
    if (!db) return;
    const fetchAllReports = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'trabajos'), orderBy('fecha_creacion', 'desc'));
        const querySnapshot = await getDocs(q);
        const allDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[];
        setReports(allDocs);
        setError(null);
      } catch (err) {
        console.error("Error fetching reports: ", err);
        setError('Error en la carga de informes.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllReports();
  }, [db]);

  const handleReprintPDF = (report: Report) => {
    let doc: jsPDF | null = null;
    const inspectorName = report.tecnicoNombre || report.inspectorNombres?.join(', ') || 'Técnico Externo';
    try {
        switch(report.formType) {
            case 'hoja-trabajo': doc = generateHojaTrabajoPDF(report, inspectorName, report.id); break;
            case 'informe-revision': doc = generateInformeRevisionPDF(report, inspectorName, report.id); break;
            case 'informe-tecnico': doc = generateInformeTecnicoPDF(report, inspectorName, report.id); break;
            case 'informe-simplificado': doc = generateInformeSimplificadoPDF(report, inspectorName, report.id); break;
            default: alert('Formato no compatible para reimpresión.'); return;
        }
        if (doc) doc.save(`Reimpresion_${report.id}.pdf`);
    } catch (e) {
        console.error("Error al reimprimir PDF:", e);
    }
  };
  
  const getReportTitle = (formType: Report['formType']) => {
    switch(formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        default: return 'Registro de Trabajo';
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : error ? (
          <p className='text-center text-red-500 font-bold uppercase text-xs'>{error}</p>
        ) : reports.length === 0 ? (
            <p className='text-center text-slate-400 font-bold uppercase text-xs'>No hay documentos registrados.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="pb-4">Documento</th>
                <th className="pb-4">Cliente / Instalación</th>
                <th className="pb-4">Equipo</th>
                <th className="pb-4">Técnico</th>
                <th className="pb-4">Fecha</th>
                <th className="pb-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4">
                      <div className="font-black text-slate-700 text-sm">{getReportTitle(report.formType)}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{report.id}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-sm font-bold text-slate-600">{report.cliente || report.clienteNombre}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase">{report.instalacion || '-'}</div>
                  </td>
                  <td className="py-4 text-[10px] font-black text-slate-400 uppercase">
                      {report.modelo && <div>MOD: {report.modelo}</div>}
                      {report.n_motor && <div>S/N: {report.n_motor}</div>}
                  </td>
                  <td className="py-4 text-xs font-bold text-slate-500">{report.tecnicoNombre || report.inspectorNombres?.join(', ')}</td>
                  <td className="py-4 text-xs font-bold text-slate-500 uppercase">{report.fecha_creacion?.toDate().toLocaleDateString() || 'N/A'}</td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleReprintPDF(report)} className="bg-slate-900 hover:bg-slate-800 text-white font-black py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest ml-auto shadow-lg shadow-slate-200">
                      <Printer size={14} className="text-primary"/>
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
