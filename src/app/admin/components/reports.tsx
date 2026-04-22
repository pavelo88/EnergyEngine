'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, FileText, AlertTriangle, Printer, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAdminHeader } from './AdminHeaderContext';
import { formatSafeDate } from '@/lib/utils';
import { getInlineImageDataUrl, getPdfFileName } from '@/lib/pdf-utils';

// Importar las funciones de generación de PDF de cada formulario
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTecnicoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';
import { generatePDF as generateRevisionBasicaPDF } from '@/app/inspection/components/forms/RevisionBasicaForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Importar los formularios para edición
import HojaTrabajoForm from '@/app/inspection/components/forms/HojaTrabajoForm';
import InformeRevisionForm from '@/app/inspection/components/forms/InformeRevisionForm';
import InformeTecnicoForm from '@/app/inspection/components/forms/InformeTecnicoForm';
import InformeSimplificadoForm from '@/app/inspection/components/forms/InformeSimplificadoForm';
import RevisionBasicaForm from '@/app/inspection/components/forms/RevisionBasicaForm';

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

const getReportTitle = (type: string | undefined) => {
  switch (type) {
    case 'hoja-trabajo': return 'Hoja de Trabajo';
    case 'informe-revision': return 'Informe de Revisión';
    case 'informe-tecnico': return 'Informe Técnico';
    case 'revision-basica': return 'Revisión Básica';
    case 'informe-simplificado': return 'Informe Simplificado';
    default: return 'Informe General';
  }
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
  }, [db, isEditDialogOpen]);

  const handleReprintPDF = (report: Report) => {
    let doc: jsPDF | null = null;
    const inspectorName = report.tecnicoNombre || report.inspectorNombres?.join(', ') || 'tecnico energy engine';
    const reportForPdf = {
      ...report,
      inspectorSignatureUrl: getInlineImageDataUrl((report as any).inspectorSignatureUrl || (report as any).inspectorSignature || ''),
      clientSignatureUrl: getInlineImageDataUrl((report as any).clientSignatureUrl || (report as any).clientSignature || ''),
    };

    try {
      switch (report.formType) {
        case 'hoja-trabajo':
          doc = generateHojaTrabajoPDF(reportForPdf, inspectorName, report.id);
          break;
        case 'informe-revision':
          doc = generateInformeRevisionPDF(reportForPdf, inspectorName, report.id);
          break;
        case 'informe-tecnico':
          doc = generateInformeTecnicoPDF(reportForPdf, inspectorName, report.id);
          break;
        case 'informe-simplificado':
          doc = generateInformeSimplificadoPDF(reportForPdf, inspectorName, report.id);
          break;
        case 'revision-basica':
          doc = generateRevisionBasicaPDF(reportForPdf, inspectorName, report.id);
          break;
        default:
          alert('El formato de este documento no soporta reimpresion automatica.');
          return;
      }

      if (doc) doc.save(getPdfFileName(report.id));
    } catch (e) {
      console.error('Error al reimprimir PDF maestro:', e);
    }
  };

  const renderForm = () => {
    if (!selectedReport) return null;
    const props = {
       initialData: selectedReport,
       aiData: null,
       onSuccess: () => {
         setIsEditDialogOpen(false);
         setSelectedReport(null);
       },
       isAdmin: true
    };

    switch(selectedReport.formType) {
      case 'hoja-trabajo': return <HojaTrabajoForm {...props} />;
      case 'informe-revision': return <InformeRevisionForm {...props} />;
      case 'informe-tecnico': return <InformeTecnicoForm {...props} />;
      case 'informe-simplificado': return <InformeSimplificadoForm {...props} />;
      case 'revision-basica': return <RevisionBasicaForm {...props} />;
      default: return <p className="p-10 text-center font-bold">Tipo de formulario no soportado para edición directa.</p>;
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
                <th className="pb-4 text-center">Estado</th> 
                <th className="pb-4">Fecha Registro</th>
                <th className="pb-4 text-right">Acciones</th>
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
                  <td className="py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border
                        ${report.estado === 'Preaprobado' ? 'bg-pink-50 text-pink-600 border-pink-100' : 
                          report.estado === 'Aprobado' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 
                          'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      {report.estado || 'Enviado'}
                    </span>
                  </td>
                  <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {formatSafeDate(report.fecha_creacion, 'dd/MM/yyyy')}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => { setSelectedReport(report); setIsEditDialogOpen(true); }}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
                      >
                        Modificar
                      </button>
                      <button 
                        onClick={() => handleReprintPDF(report)} 
                        className="bg-slate-900 hover:bg-primary text-white font-black py-2 px-4 rounded-xl transition-all flex items-center gap-2 text-[9px] uppercase tracking-[0.1em] shadow-lg shadow-slate-200 active:scale-95"
                      >
                        <Printer size={14} />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto p-0 rounded-[2.5rem] bg-white text-slate-950 border-none shadow-2xl">
          <DialogHeader className="p-8 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <FileText size={20} />
              </div>
              Revisión Administrativa: {selectedReport?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 md:p-8">
             {renderForm()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
