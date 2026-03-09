'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
<<<<<<< HEAD
import { Loader2, FileText, AlertTriangle, Printer, Download, MapPin } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
=======
import { Loader2, FileText, AlertTriangle, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

// Importar las funciones de generación de PDF de cada formulario
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTrabajoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';


interface Report {
  id: string;
  cliente: string;
  clienteNombre?: string;
<<<<<<< HEAD
  instalacion?: string;
  location?: { lat: number, lon: number };
  modelo?: string;
  n_motor?: string;
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  fecha_guardado: any; 
  formType: 'hoja-trabajo' | 'informe-revision' | 'informe-tecnico' | 'revision-basica' | 'informe-simplificado' | 'job' | undefined;
  [key: string]: any; // Para el resto de los datos
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!db) return;
    const fetchAllReports = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'trabajos'), orderBy('fecha_guardado', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const allDocs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Report[];

        setReports(allDocs);
        setError(null);
      } catch (err) {
        console.error("Error fetching reports: ", err);
        setError('No se pudieron cargar los informes. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllReports();
  }, [db]);

  const handleReprintPDF = (report: Report) => {
    let doc: jsPDF | null = null;
    try {
        switch(report.formType) {
            case 'hoja-trabajo':
                doc = generateHojaTrabajoPDF(report, report.tecnicoNombre, report.id);
                break;
            case 'informe-revision':
                doc = generateInformeRevisionPDF(report, report.tecnicoNombre, report.id);
                break;
            case 'revision-basica':
                // This form was removed
                alert('El formulario de Revisión Básica ha sido eliminado.');
                return;
            case 'informe-tecnico':
                doc = generateInformeTecnicoPDF(report, report.tecnicoNombre, report.id_informe);
                break;
            case 'informe-simplificado':
                doc = generateInformeSimplificadoPDF(report, report.tecnicoNombre, report.id);
                break;
            default:
                alert('Este tipo de documento no tiene un formato de PDF para reimprimir.');
                return;
        }

        if (doc) {
            doc.save(`Reimpresion_${report.id}.pdf`);
        }
    } catch (e) {
        console.error("Error al reimprimir PDF:", e);
        alert("No se pudo generar el PDF. Revisa la consola para más detalles.");
    }
  };
  
  const getReportTitle = (formType: Report['formType']) => {
    switch(formType) {
        case 'hoja-trabajo': return 'Hoja de Trabajo';
        case 'informe-revision': return 'Informe de Revisión';
        case 'revision-basica': return 'Revisión Básica';
        case 'informe-tecnico': return 'Informe Técnico';
        case 'informe-simplificado': return 'Informe Simplificado';
        case 'job': return 'Trabajo Manual';
        default: return 'Documento General';
    }
  };

<<<<<<< HEAD
  const handleExport = () => {
    const dataToExport = reports.map(report => ({
      ID: report.id,
      Tipo: getReportTitle(report.formType),
      Cliente: report.cliente || report.clienteNombre,
      Instalación: report.instalacion || 'N/A',
      Fecha: report.fecha_guardado?.toDate()?.toLocaleDateString() || 'N/A',
      Modelo: report.modelo || 'N/A',
      "Nº Motor/Serie": report.n_motor || 'N/A',
      Ubicación: report.location ? `${report.location.lat.toFixed(5)}, ${report.location.lon.toFixed(5)}` : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informes");
    XLSX.writeFile(workbook, `Reporte_Informes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Historial de Documentos</h1>
          <p className="mt-1 text-slate-600">Reimprime los PDFs de todos los informes y trabajos guardados.</p>
        </div>
        <Button onClick={handleExport} variant="outline">
            <Download className="mr-2" size={16} />
            Exportar a Excel
        </Button>
=======
  return (
    <div className="p-6 h-full bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Historial de Documentos</h1>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-20">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-20 text-red-600">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <p className='text-center'>{error}</p>
          </div>
        ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                <FileText className="h-12 w-12 mb-4" />
                <p className='text-center'>No hay documentos guardados todavía.</p>
            </div>
        ) : (
<<<<<<< HEAD
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Documento</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente / Instalación</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Equipo</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{getReportTitle(report.formType)}</div>
                        <div className="text-xs text-slate-500">{report.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.cliente || report.clienteNombre}<br/><span className="text-xs">{report.instalacion || ''}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                        {report.modelo && <div><b>Modelo:</b> {report.modelo}</div>}
                        {report.n_motor && <div><b>S/N:</b> {report.n_motor}</div>}
                        {report.location && <div className="flex items-center gap-1 mt-1"><MapPin size={12} className="text-slate-400"/> {report.location.lat.toFixed(4)}, {report.location.lon.toFixed(4)}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.fecha_guardado?.toDate().toLocaleDateString() || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleReprintPDF(report)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                        <Printer size={16}/>
                        Reimprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
=======
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID Documento</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{report.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-bold">{getReportTitle(report.formType)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.cliente || report.clienteNombre}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.fecha_guardado?.toDate().toLocaleDateString() || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleReprintPDF(report)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg transition-colors flex items-center gap-2">
                      <Printer size={16}/>
                      Reimprimir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
        )}
      </div>
    </div>
  );
}
