'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Loader2, FileText, AlertTriangle, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Importar las funciones de generación de PDF de cada formulario
import { generatePDF as generateHojaTrabajoPDF } from '@/app/inspection/components/forms/HojaTrabajoForm';
import { generatePDF as generateInformeRevisionPDF } from '@/app/inspection/components/forms/InformeRevisionForm';
import { generatePDF as generateInformeTecnicoPDF } from '@/app/inspection/components/forms/InformeTrabajoForm';
import { generatePDF as generateInformeSimplificadoPDF } from '@/app/inspection/components/forms/InformeSimplificadoForm';


interface Report {
  id: string;
  cliente: string;
  clienteNombre?: string;
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

  return (
    <div className="p-6 h-full bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Historial de Documentos</h1>
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
        )}
      </div>
    </div>
  );
}
