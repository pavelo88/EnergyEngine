'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  Loader2, Download, Eye, MapPin, ImageIcon, Euro, Clock, User,
  Calendar as CalendarIcon, CheckCircle2, XCircle, FileText
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';

// --- TIPOS ---
type Stop = {
  clienteNombre: string;
  actividad: string;
  hora: string;
  ubicacion: { lat: number, lon: number } | null;
  horasNormales: number;
  horasExtras: number;
  horasEspeciales: number;
  motorUrl?: string;
};

type GastoInterno = {
  descripcion: string;
  monto: number;
  rubro: string;
  forma_pago: string;
  horaGasto?: string;
  comprobanteUrl?: string;
};

type ReporteGasto = {
  id: string;
  fecha: any;
  inspectorId: string;
  inspectorNombre: string;
  observaciones?: string;
  total: number;
  estado: string;
  firmaUrl?: string;
  pdfUrl?: string;
  itinerario?: Stop[];
  gastos?: GastoInterno[];
};

export default function ExpensesPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [reportes, setReportes] = useState<ReporteGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspectorReports, setSelectedInspectorReports] = useState<ReporteGasto[] | null>(null);

  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [db]);

  const fetchData = async () => {
    if (!db) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'gastos'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReporteGasto));
      setReportes(data);
    } catch (error) {
      toast({ title: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reportesFiltrados = useMemo(() => {
    return reportes.filter(r => {
      const fechaDoc = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      const matchInspector = filtroInspector === 'todos' || r.inspectorId === filtroInspector;
      let matchFecha = true;
      if (fechaDesde && fechaHasta) {
        matchFecha = isWithinInterval(fechaDoc, {
          start: startOfDay(fechaDesde),
          end: endOfDay(fechaHasta)
        });
      }
      return matchInspector && matchFecha;
    });
  }, [reportes, filtroInspector, fechaDesde, fechaHasta]);

  const resumenInspectores = useMemo(() => {
    const agg: Record<string, any> = {};
    reportesFiltrados.forEach(r => {
      const nombre = r.inspectorNombre || 'Desconocido';
      if (!agg[nombre]) {
        agg[nombre] = { nombre, hNormales: 0, hExtras: 0, hEspeciales: 0, totalGastos: 0, docs: [] };
      }
      const ins = agg[nombre];
      ins.totalGastos += r.total || 0;
      r.itinerario?.forEach(s => {
        ins.hNormales += (s.horasNormales || 0);
        ins.hExtras += (s.horasExtras || 0);
        ins.hEspeciales += (s.horasEspeciales || 0);
      });
      ins.docs.push(r);
    });
    return Object.values(agg);
  }, [reportesFiltrados]);

  const detalleAgregadoInspector = useMemo(() => {
    if (!selectedInspectorReports) return null;
    const resumen = {
      hNormales: 0, hExtras: 0, hEspeciales: 0,
      gastosPorRubro: {} as Record<string, number>,
      totalGeneral: 0
    };
    selectedInspectorReports.forEach(report => {
      report.itinerario?.forEach(stop => {
        resumen.hNormales += (stop.horasNormales || 0);
        resumen.hExtras += (stop.horasExtras || 0);
        resumen.hEspeciales += (stop.horasEspeciales || 0);
      });
      report.gastos?.forEach(g => {
        const rubro = g.rubro || 'Otros';
        resumen.gastosPorRubro[rubro] = (resumen.gastosPorRubro[rubro] || 0) + (g.monto || 0);
        resumen.totalGeneral += (g.monto || 0);
      });
    });
    return resumen;
  }, [selectedInspectorReports]);

  const exportToExcelAuditoria = () => {
    const wb = XLSX.utils.book_new();
    const dataGastos = reportesFiltrados.flatMap(r => r.gastos?.map(g => ({
      Fecha: r.fecha?.toDate ? format(r.fecha.toDate(), 'dd/MM/yyyy') : r.fecha,
      Inspector: r.inspectorNombre,
      Rubro: g.rubro,
      Pago: g.forma_pago,
      Hora: g.horaGasto || '--:--',
      Valor: g.monto
    })) || []);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataGastos), "Detalle Gastos");

    const dataHoras = reportesFiltrados.flatMap(r => r.itinerario?.map(s => ({
      Fecha: r.fecha?.toDate ? format(r.fecha.toDate(), 'dd/MM/yyyy') : r.fecha,
      Inspector: r.inspectorNombre,
      Cliente: s.clienteNombre,
      Normales: s.horasNormales || 0,
      Extras: s.horasExtras || 0,
      Especiales: s.horasEspeciales || 0
    })) || []);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataHoras), "Detalle Horas");
    XLSX.writeFile(wb, `Auditoria_EnergyEngine_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  // --- PDF CORPORATIVO (Sin dependencias externas) ---
  const handleDownloadPDF = (report: ReporteGasto) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const darkColor = '#0f172a';
    const emeraldColor = '#10b981';
    const leftMargin = 15;
    const rightMargin = 15;
    const reportDate = report.fecha?.toDate ? format(report.fecha.toDate(), 'dd/MM/yyyy') : report.fecha;
    let currentY = 35; // Empezamos debajo de la cabecera verde

    // TÍTULO
    doc.setTextColor(darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BITÁCORA DE TIEMPOS Y GASTOS', leftMargin, currentY);
    currentY += 8;

    // INFO GENERAL
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Fecha:', reportDate, 'Inspector:', report.inspectorNombre.toUpperCase()],
        [{ content: 'Total Gastos Aprobados:', styles: { fontStyle: 'bold' } }, { content: `${(report.total || 0).toFixed(2)}€`, colSpan: 3 }],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, lineColor: '#e2e8f0', lineWidth: 0.1 },
      headStyles: { fillColor: '#ffffff', textColor: darkColor },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
      margin: { left: leftMargin, right: rightMargin },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // TABLA HORAS
    if (report.itinerario && report.itinerario.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Desglose de Horas', leftMargin, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        headStyles: { fillColor: darkColor, textColor: '#ffffff' },
        styles: { fontSize: 8, cellPadding: 2 },
        head: [['Cliente / Instalación', 'Actividad', 'H. Normal', 'H. Extra', 'H. Esp.']],
        body: report.itinerario.map(s => [
          s.clienteNombre || '-',
          s.actividad || '-',
          `${(s.horasNormales || 0).toFixed(1)}h`,
          `${(s.horasExtras || 0).toFixed(1)}h`,
          `${(s.horasEspeciales || 0).toFixed(1)}h`
        ]),
        margin: { left: leftMargin, right: rightMargin },
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // TABLA GASTOS
    if (report.gastos && report.gastos.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Liquidación de Gastos', leftMargin, currentY);

      autoTable(doc, {
        startY: currentY + 4,
        headStyles: { fillColor: emeraldColor, textColor: '#ffffff' },
        styles: { fontSize: 8, cellPadding: 2 },
        head: [['Categoría', 'Concepto', 'Pago', 'Importe', 'Ticket']],
        body: report.gastos.map(g => [
          g.rubro || '-',
          g.descripcion || '-',
          g.forma_pago || '-',
          `${(g.monto || 0).toFixed(2)}€`,
          g.comprobanteUrl ? 'Foto Adjunta' : 'Sin Foto'
        ]),
        margin: { left: leftMargin, right: rightMargin },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // SALTO DE PÁGINA PARA FIRMA (Si no cabe)
    if (currentY + 40 > pageHeight - 20) {
      doc.addPage();
      currentY = 35;
    }

    // FIRMA DEL INSPECTOR
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkColor);
    doc.text('Firma del Inspector:', leftMargin, currentY);

    if (report.firmaUrl) {
      try {
        doc.addImage(report.firmaUrl, 'PNG', leftMargin, currentY + 4, 40, 20);
      } catch (e) {
        doc.setTextColor(100, 116, 139);
        doc.text('[Firma Digital Registrada en Base de Datos]', leftMargin, currentY + 10);
      }
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('[Firma Digital Registrada en Base de Datos]', leftMargin, currentY + 10);
    }

    // CABECERA VERDE Y PIE DE PÁGINA OFICIAL PARA TODAS LAS PÁGINAS
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Cabecera Verde Energy Engine
      doc.setFillColor(22, 163, 74); // #16a34a (Verde corporativo)
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('energy engine', leftMargin, 11);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('GRUPOS ELECTRÓGENOS', leftMargin, 15);

      doc.setFontSize(7);
      doc.text('www.energyengine.es', pageWidth - rightMargin, 9, { align: 'right' });
      doc.text('Tel: 92 515 43 53', pageWidth - rightMargin, 13, { align: 'right' });
      doc.text('serviciotecnico@energyengine.es', pageWidth - rightMargin, 17, { align: 'right' });

      // Pie de Página
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, pageHeight - 15, pageWidth - rightMargin, pageHeight - 15);
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('Energy Engine Management', leftMargin, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`Bitacora_${report.inspectorNombre.replace(/\s+/g, '_')}_${reportDate.replace(/\//g, '')}.pdf`);
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-slate-900 mb-4" size={40} />
      <p className="font-black text-[10px] uppercase text-slate-900 tracking-widest">Sincronizando Auditoría...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen text-left">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* CABECERA NEGRA SÓLIDA */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-left">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Gestión de Trabajos</h1>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Bitácora de Tiempos y Gastos</p>
          </div>
          <Button onClick={exportToExcelAuditoria} className="h-14 rounded-2xl bg-emerald-500 text-slate-900 font-black px-8 hover:bg-emerald-400 gap-2 shadow-lg">
            <Download size={20} /> EXPORTAR AUDITORÍA (2 HOJAS)
          </Button>
        </div>

        {/* FILTROS CON HOVER VERDE ENERGY ENGINE */}
        <div className="bg-slate-100 p-6 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-6 border-2 border-slate-900">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase ml-2">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full h-12 justify-start text-left font-bold rounded-xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500 transition-colors">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : <span>SELECCIONAR FECHA</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl bg-white border-2 border-slate-900 shadow-2xl z-[200]">
                <Calendar mode="single" selected={fechaDesde} onSelect={setFechaDesde} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase ml-2">Hasta</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full h-12 justify-start text-left font-bold rounded-xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500 transition-colors">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : <span>SELECCIONAR FECHA</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl bg-white border-2 border-slate-900 shadow-2xl z-[200]">
                <Calendar mode="single" selected={fechaHasta} onSelect={setFechaHasta} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-900 uppercase ml-2">Filtrar Inspector</label>
            <Select value={filtroInspector} onValueChange={setFiltroInspector}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-2 border-slate-900 font-bold text-slate-900 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500 transition-colors">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-slate-900 rounded-xl">
                <SelectItem value="todos" className="font-bold">TODOS LOS INSPECTORES</SelectItem>
                {Array.from(new Set(reportes.map(r => r.inspectorId))).map(id => (
                  <SelectItem key={id} value={id} className="font-bold">{reportes.find(r => r.inspectorId === id)?.inspectorNombre.toUpperCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-900 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr className="text-white uppercase text-[10px] font-black tracking-widest text-center">
                <th className="px-6 py-6 text-left">Inspector</th>
                <th className="px-6 py-6">H. Normales</th>
                <th className="px-6 py-6 text-emerald-400">H. Extras</th>
                <th className="px-6 py-6 text-emerald-400">H. Especiales</th>
                <th className="px-6 py-5">Total Gastos</th>
                <th className="px-6 py-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {resumenInspectores.map((ins) => (
                <tr key={ins.nombre} className="hover:bg-slate-50 transition-all text-center">
                  <td className="px-6 py-5 text-left cursor-pointer group" onClick={() => setSelectedInspectorReports(ins.docs)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xs group-hover:bg-emerald-500 transition-colors">
                        {ins.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-black text-slate-900 text-sm uppercase group-hover:text-emerald-600 underline decoration-slate-300 decoration-2 underline-offset-4">{ins.nombre}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-black text-slate-900">{(ins.hNormales || 0).toFixed(2)}h</td>
                  <td className="px-6 py-5 font-black text-slate-900">{(ins.hExtras || 0).toFixed(2)}h</td>
                  <td className="px-6 py-5 font-black text-slate-900">{(ins.hEspeciales || 0).toFixed(2)}h</td>
                  <td className="px-6 py-5 font-black text-slate-900 text-lg">{(ins.totalGastos || 0).toFixed(2)}€</td>
                  <td className="px-6 py-5 text-right">
                    <Button onClick={() => setSelectedInspectorReports(ins.docs)} variant="ghost" className="rounded-xl font-black text-[10px] bg-slate-100 text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all">
                      <Eye size={16} className="mr-2" /> REVISAR
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE CON SUBTABLAS Y BOTÓN DESCARGAR PDF */}
      <Dialog open={!!selectedInspectorReports} onOpenChange={() => setSelectedInspectorReports(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-0 border-none bg-white shadow-2xl">
          <DialogTitle className="sr-only">Detalle del Inspector</DialogTitle>
          <DialogDescription className="sr-only">Historial de gastos y horas</DialogDescription>

          {selectedInspectorReports && detalleAgregadoInspector && (
            <div className="text-left">
              <div className="bg-slate-900 p-10 text-white rounded-t-[3rem] flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{selectedInspectorReports[0].inspectorNombre}</h2>
                  <p className="text-emerald-400 font-black text-xs mt-3 uppercase tracking-widest">Resumen de Liquidación Mensual</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-white">{(detalleAgregadoInspector.totalGeneral || 0).toFixed(2)}€</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Gasto Acumulado</p>
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* RESUMEN POR RUBRO */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-900 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Euro size={14} /> Gastos por Categoría</h3>
                    <div className="space-y-3">
                      {Object.entries(detalleAgregadoInspector.gastosPorRubro).map(([rubro, total]) => (
                        <div key={rubro} className="flex justify-between items-center border-b-2 border-slate-100 pb-2">
                          <span className="font-bold text-slate-700 text-xs uppercase">{rubro}</span>
                          <span className="font-black text-slate-900 text-sm">{(total as number || 0).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RESUMEN POR HORAS */}
                  <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-900 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={14} /> Horas Totales</h3>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[8px] font-black text-slate-400 uppercase">Normal</p><p className="text-lg font-black text-slate-900">{(detalleAgregadoInspector.hNormales || 0).toFixed(1)}h</p></div>
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100"><p className="text-[8px] font-black text-amber-500 uppercase">Extra</p><p className="text-lg font-black text-amber-600">{(detalleAgregadoInspector.hExtras || 0).toFixed(1)}h</p></div>
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[8px] font-black text-emerald-500 uppercase">Esp.</p><p className="text-lg font-black text-emerald-600">{(detalleAgregadoInspector.hEspeciales || 0).toFixed(1)}h</p></div>
                    </div>
                  </div>
                </div>

                {/* HISTORIAL POR FECHA */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-2">Jornadas Diarias</h3>
                  <table className="w-full border-separate border-spacing-y-3">
                    <tbody>
                      {selectedInspectorReports.map((report) => {
                        const hn = report.itinerario?.reduce((acc, s) => acc + (s.horasNormales || 0), 0) || 0;
                        const he = report.itinerario?.reduce((acc, s) => acc + (s.horasExtras || 0), 0) || 0;
                        const hs = report.itinerario?.reduce((acc, s) => acc + (s.horasEspeciales || 0), 0) || 0;
                        const totalH = hn + he + hs;
                        return (
                          <tr key={report.id} className="bg-slate-50 rounded-2xl overflow-hidden shadow-sm hover:border-slate-900 border-2 border-transparent transition-all">
                            <td className="px-6 py-5 rounded-l-2xl font-black text-slate-900 text-xs uppercase">
                              {report.fecha?.toDate ? format(report.fecha.toDate(), 'eeee dd MMM', { locale: es }) : report.fecha}
                            </td>
                            <td className="px-6 py-5 text-center font-black text-slate-900">{(totalH || 0).toFixed(2)}h</td>
                            <td className="px-6 py-5 text-center font-black text-emerald-600">{(report.total || 0).toFixed(2)}€</td>
                            <td className="px-6 py-5 text-right rounded-r-2xl">
                              <Button
                                onClick={() => handleDownloadPDF(report)}
                                className="h-8 px-4 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase hover:bg-emerald-500 transition-colors"
                              >
                                <Download size={12} className="mr-1.5" /> DESCARGAR PDF
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}