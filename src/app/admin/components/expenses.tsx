'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useAdminHeader } from './AdminHeaderContext';
import {
  Loader2, Download, Eye, MapPin, ImageIcon, Euro, Clock, User,
  Calendar as CalendarIcon, CheckCircle2, XCircle, FileText, Pencil,
  Check
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
import { cn, decimalToTime, timeToDecimal } from "@/lib/utils";
import { useToast } from '@/hooks/use-toast';
import { drawPdfHeader, drawPdfFooter } from '@/app/inspection/lib/pdf-helpers';
import ReportGeneratorModal from './ReportGeneratorModal';

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
  const pathname = usePathname();
  const { setHeaderProps } = useAdminHeader();
  const isHoursMode = pathname?.includes('hours');
  const { toast } = useToast();
  const [reportes, setReportes] = useState<ReporteGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspectorReports, setSelectedInspectorReports] = useState<ReporteGasto[] | null>(null);
  const [filtroInspector, setFiltroInspector] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'inspectores' | 'registros'>(isHoursMode ? 'registros' : 'inspectores');
  const [editingReport, setEditingReport] = useState<ReporteGasto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [db]);

  // Sincronizar viewMode si cambia el modo de la página
  useEffect(() => {
    setViewMode(isHoursMode ? 'registros' : 'inspectores');
  }, [isHoursMode]);

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

  const getFormattedDate = (fecha: any) => {
    if (!fecha) return '—';
    if (fecha.toDate) return format(fecha.toDate(), 'dd/MM/yyyy');
    if (fecha instanceof Date) return format(fecha, 'dd/MM/yyyy');
    if (fecha.seconds) return format(new Date(fecha.seconds * 1000), 'dd/MM/yyyy');
    if (typeof fecha === 'string') return fecha;
    return '—';
  };

  const getShortName = (name: string) => {
    if (!name) return '—';
    if (!name.includes('@')) return name;
    
    const prefix = name.split('@')[0].toLowerCase();
    if (prefix === 'mocanubaluta') return 'Mocanu Baluta';
    if (prefix === 'juancabral') return 'Juan Cabral';
    if (prefix === 'carlosamarilla') return 'Carlos Amarilla';
    if (prefix === 'antoniougena') return 'Antonio Ugena';
    if (prefix === 'admin') return 'Admin Principal';
    
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
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
      const nombre = getShortName(r.inspectorNombre || 'Desconocido');
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

  const exportExcelGastos = () => {
    const wb = XLSX.utils.book_new();
    const dataGastos = reportesFiltrados.flatMap(r => r.gastos?.map(g => ({
      'ESTADO': (r.estado || 'PRE-APROBADO').toUpperCase(),
      'FECHA': getFormattedDate(r.fecha),
      'INSPECTOR': r.inspectorNombre.toUpperCase(),
      'RUBRO': g.rubro.toUpperCase(),
      'CONCEPTO': g.descripcion,
      'FORMA DE PAGO': g.forma_pago.toUpperCase(),
      'MONTO': g.monto
    })) || []);
    const ws = XLSX.utils.json_to_sheet(dataGastos);
    XLSX.utils.book_append_sheet(wb, ws, "LIQUIDACIÓN GASTOS");
    XLSX.writeFile(wb, `Gastos_Auditoria_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  const exportExcelHoras = () => {
    const wb = XLSX.utils.book_new();
    const dataHoras = reportesFiltrados.flatMap(r => r.itinerario?.map(s => {
      const row: any = {
        'ESTADO': (r.estado || 'PRE-APROBADO').toUpperCase(),
        'FECHA': getFormattedDate(r.fecha),
        'INSPECTOR': r.inspectorNombre.toUpperCase(),
        'CLIENTE': s.clienteNombre.toUpperCase(),
        'ACTIVIDAD': s.actividad,
        'H. NORMALES': s.horasNormales || 0,
        'H. EXTRAS': s.horasExtras || 0,
        'H. ESPECIALES': s.horasEspeciales || 0
      };
      if (s.ubicacion?.lat) {
        row['UBICACIÓN MAPS'] = `https://www.google.com/maps?q=${s.ubicacion.lat},${s.ubicacion.lon}`;
      }
      return row;
    }) || []);
    const ws = XLSX.utils.json_to_sheet(dataHoras);
    XLSX.utils.book_append_sheet(wb, ws, "CONTROL HORAS");
    XLSX.writeFile(wb, `Horas_Auditoria_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  useEffect(() => {
    setHeaderProps({
      title: isHoursMode ? 'Gestión de Horas' : 'Liquidación de Gastos',
      action: (
        <div className="flex gap-2">
          {isHoursMode && (
            <Button 
              onClick={() => setIsReportModalOpen(true)}
              className="h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] gap-2 px-6 uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
            >
              <FileText size={14} /> REPORTES PDF
            </Button>
          )}
          <Button 
            onClick={isHoursMode ? exportExcelHoras : exportExcelGastos}
            className="h-10 rounded-xl bg-[#10b981] text-white font-black text-[10px] gap-2 px-6 uppercase tracking-widest shadow-lg shadow-[#10b981]/20 hover:bg-[#062113] transition-all"
          >
            <Download size={14} /> EXPORTAR EXCEL
          </Button>
        </div>
      )
    });
  }, [isHoursMode, reportesFiltrados, setHeaderProps, setIsReportModalOpen]);

  const handleUpdateReport = async (updated: ReporteGasto) => {
    try {
      await updateDoc(doc(db, 'gastos', updated.id), updated as any);
      toast({ title: "Registro actualizado" });
      setIsEditModalOpen(false);
      fetchData();
    } catch (e) {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  // --- PDF CORPORATIVO (Sin dependencias externas) ---
  const handleDownloadPDF = (report: ReporteGasto) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const darkColor = '#165a30';
    const emeraldColor = '#10b981';
    const leftMargin = 15;
    const rightMargin = 15;
    const reportDate = getFormattedDate(report.fecha);
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
        [{ content: isHoursMode ? 'Control de Tiempos:' : 'Total Gastos Aprobados:', styles: { fontStyle: 'bold' } }, { content: isHoursMode ? 'REGISTRO DE JORNADA' : `${(report.total || 0).toFixed(2)}€`, colSpan: 3 }],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2, lineColor: '#e2e8f0', lineWidth: 0.1 },
      headStyles: { fillColor: '#ffffff', textColor: darkColor },
      columnStyles: { 0: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' } },
      margin: { left: leftMargin, right: rightMargin },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // TABLA HORAS
    if (isHoursMode && report.itinerario && report.itinerario.length > 0) {
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
    if (!isHoursMode && report.gastos && report.gastos.length > 0) {
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

    // CABECERA Y PIE DE PÁGINA PARA TODAS LAS PÁGINAS
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, pageCount);
    }

    doc.save(`Bitacora_${report.inspectorNombre.replace(/\s+/g, '_')}_${reportDate.replace(/\//g, '')}.pdf`);
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center gap-3">
      <Loader2 className="animate-spin text-primary" />
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sincronizando Auditoría...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* FILTROS Y ACCIONES */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Desde</label>
          <input type="date" value={fechaDesde ? format(fechaDesde, 'yyyy-MM-dd') : ''} onChange={e => setFechaDesde(e.target.value ? new Date(e.target.value) : undefined)} className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Hasta</label>
          <input type="date" value={fechaHasta ? format(fechaHasta, 'yyyy-MM-dd') : ''} onChange={e => setFechaHasta(e.target.value ? new Date(e.target.value) : undefined)} className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold" />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Inspector</label>
          <Select value={filtroInspector} onValueChange={setFiltroInspector}>
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-slate-900 text-xs font-bold"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-xl text-slate-900">
              <SelectItem value="todos" className="text-xs font-bold uppercase">TODOS</SelectItem>
              {Array.from(new Set(reportes.map(r => r.inspectorId))).map(id => (
                <SelectItem key={id} value={id} className="text-xs font-bold uppercase">
                  {reportes.find(r => r.inspectorId === id)?.inspectorNombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Vista</label>
          <div className="h-10 bg-slate-100 p-1 rounded-xl flex gap-1">
             <Button onClick={() => setViewMode('inspectores')} variant={viewMode === 'inspectores' ? 'default' : 'ghost'} className={cn("flex-1 h-full rounded-lg text-[9px] font-black uppercase", viewMode === 'inspectores' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Resumen</Button>
             <Button onClick={() => setViewMode('registros')} variant={viewMode === 'registros' ? 'default' : 'ghost'} className={cn("flex-1 h-full rounded-lg text-[9px] font-black uppercase", viewMode === 'registros' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>Detalle</Button>
          </div>
        </div>

      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {viewMode === 'inspectores' ? (
            <table className="w-full">
              <thead className="bg-[#062113]">
                <tr className="text-white uppercase text-[9px] font-black tracking-[0.15em] text-center border-b border-white/10">
                  <th className="px-5 py-5 text-left rounded-tl-2xl">Inspector</th>
                  {isHoursMode ? (
                    <>
                      <th className="px-5 py-5">H. Normales</th>
                      <th className="px-5 py-5 text-[#10b981]">H. Extras</th>
                      <th className="px-5 py-5 text-[#10b981]">H. Especiales</th>
                    </>
                  ) : (
                    <th className="px-5 py-5">Total Gastos</th>
                  )}
                  <th className="px-5 py-5 text-right rounded-tr-2xl">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumenInspectores.map((ins) => (
                  <tr key={ins.nombre} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-center group/row">
                    <td className="px-5 py-4 text-left cursor-pointer" onClick={() => setSelectedInspectorReports(ins.docs)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#062113] text-[#10b981] rounded-xl flex items-center justify-center font-black text-[10px] group-hover/row:scale-110 transition-transform shadow-lg shadow-slate-200">
                          {ins.nombre.substring(0, 2)}
                        </div>
                        <span className="font-black text-slate-900 text-sm uppercase tracking-tight">{ins.nombre}</span>
                      </div>
                    </td>
                    {isHoursMode ? (
                      <>
                        <td className="px-5 py-4 font-black text-slate-600 text-xs">{decimalToTime(ins.hNormales || 0)}</td>
                        <td className="px-5 py-4 font-black text-emerald-600 text-xs">{decimalToTime(ins.hExtras || 0)}</td>
                        <td className="px-5 py-4 font-black text-emerald-600 text-xs">{decimalToTime(ins.hEspeciales || 0)}</td>
                      </>
                    ) : (
                      <td className="px-5 py-4 font-black text-[#0f172a] text-lg">{(ins.totalGastos || 0).toFixed(2)}€</td>
                    )}
                    <td className="px-5 py-4 text-right">
                      <Button onClick={() => setSelectedInspectorReports(ins.docs)} variant="outline" className="h-9 px-4 rounded-xl font-black text-[9px] bg-slate-800 text-white border-slate-800 hover:bg-[#062113] hover:border-[#062113] transition-all uppercase tracking-widest shadow-sm">
                        <Eye size={14} className="mr-2" /> REVISAR
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-[#062113]">
                <tr className="text-white uppercase text-[9px] font-black tracking-[0.15em] text-center border-b border-white/10">
                  <th className="px-5 py-5 text-left rounded-tl-2xl">Fecha</th>
                  <th className="px-5 py-5 text-left">Inspector/Estado</th>
                  {isHoursMode ? (
                    <>
                      <th className="px-5 py-5">Clientes/Sitios</th>
                      <th className="px-5 py-5">Total Horas (N/E)</th>
                    </>
                  ) : (
                    <th className="px-5 py-5">Monto Gastos</th>
                  )}
                  <th className="px-5 py-5 text-right rounded-tr-2xl">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportesFiltrados.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-center group/row">
                    <td className="px-5 py-4 text-left font-black text-slate-400 text-xs">{getFormattedDate(r.fecha)}</td>
                    <td className="px-5 py-4 text-left font-black text-slate-900">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs uppercase tracking-tight text-slate-700">{getShortName(r.inspectorNombre)}</span>
                        <div className={`text-[7px] px-2 py-0.5 rounded-md font-black uppercase tracking-[0.1em] mt-1.5 ${r.estado === 'Aprobado' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {r.estado || 'PENDIENTE'}
                        </div>
                      </div>
                    </td>
                              {isHoursMode ? (
                                <>
                                  <td className="px-5 py-4">
                                    <div className="flex flex-wrap justify-center gap-1">
                                      {r.itinerario?.map((s, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                                          {s.clienteNombre}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 font-black text-slate-900">
                                    {decimalToTime(r.itinerario?.reduce((acc, s) => acc + (s.horasNormales || 0), 0) || 0)} / {decimalToTime(r.itinerario?.reduce((acc, s) => acc + (s.horasExtras || 0), 0) || 0)}
                                  </td>
                                </>
                              ) : (
                                <td className="px-5 py-4 font-black text-emerald-600">{(r.total || 0).toFixed(2)}€</td>
                              )}
                              <td className="px-5 py-4 text-right flex justify-end gap-2 pr-6">
                                {r.estado !== 'Aprobado' && (
                                  <Button 
                                    onClick={() => handleUpdateReport({ ...r, estado: 'Aprobado' })} 
                                    variant="outline" size="icon" 
                                    className="h-9 w-9 bg-[#10b981] border-[#10b981] rounded-xl text-white hover:bg-emerald-600 transition-all shadow-sm"
                                    title="Aprobar Directamente"
                                  >
                                    <Check size={16} />
                                  </Button>
                                )}
                                <Button onClick={() => { setEditingReport(r); setIsEditModalOpen(true); }} variant="outline" title="Editar" size="icon" className="h-9 w-9 bg-slate-800 border-slate-800 rounded-xl text-white hover:bg-[#062113] hover:border-[#062113] transition-all shadow-sm"><Pencil size={16} /></Button>
                                <Button onClick={() => handleDownloadPDF(r)} variant="outline" title="Descargar" size="icon" className="h-9 w-9 bg-slate-800 border-slate-800 rounded-xl text-white hover:bg-emerald-600 hover:border-emerald-600 transition-all shadow-sm"><Download size={16} /></Button>
                              </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* MODAL DETALLE INSPECTOR */}
      <Dialog open={!!selectedInspectorReports} onOpenChange={() => setSelectedInspectorReports(null)}>
        <DialogContent className="max-w-4xl p-0 bg-[#f1f5f9] border-none rounded-[3rem] overflow-hidden shadow-2xl">
          {selectedInspectorReports && selectedInspectorReports.length > 0 && (
            <div className="flex flex-col h-[85vh]">
              <div className="bg-[#062113] p-10 text-white rounded-b-[4rem] flex justify-between items-end shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/10 rounded-full blur-[80px] translate-x-1/2 translate-y-[-1/2]"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-[#10b981]">{selectedInspectorReports[0].inspectorNombre}</h2>
                  <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-[0.2em]">{isHoursMode ? 'Control Técnico de Tiempos' : 'Liquidación de Gastos Operativos'}</p>
                </div>
                <div className="text-right relative z-10">
                  <p className="text-5xl font-black text-white">
                    {isHoursMode 
                      ? decimalToTime((detalleAgregadoInspector?.hNormales || 0) + (detalleAgregadoInspector?.hExtras || 0) + (detalleAgregadoInspector?.hEspeciales || 0))
                      : `${(detalleAgregadoInspector?.totalGeneral || 0).toFixed(2)}€`
                    }
                  </p>
                  <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest mt-1">{isHoursMode ? 'Total Acumulado' : 'Liquidación Pendiente'}</p>
                </div>
              </div>

              <div className="p-10 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* RESUMEN POR RUBRO */}
                  {!isHoursMode && (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <h3 className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Euro size={16} />
                        </div>
                        Gastos por Categoría
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(detalleAgregadoInspector?.gastosPorRubro || {}).map(([rubro, total]) => (
                          <div key={rubro} className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <span className="font-bold text-slate-500 text-[11px] uppercase tracking-tight">{rubro}</span>
                            <span className="font-black text-[#0f172a] text-sm">{(total as number || 0).toFixed(2)}€</span>
                          </div>
                        ))}
                        <div className="pt-4 flex justify-between items-center border-t border-slate-900 border-dashed">
                           <span className="font-black text-[#0f172a] text-[11px] uppercase">TOTAL GASTOS</span>
                           <span className="font-black text-emerald-600 text-lg">{(detalleAgregadoInspector?.totalGeneral || 0).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RESUMEN POR HORAS */}
                  {isHoursMode && (
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm col-span-2">
                      <h3 className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <Clock size={16} />
                        </div>
                        Desglose de Jornada Técnica
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-5 bg-[#f8fafc] rounded-3xl border border-slate-100 shadow-inner">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Horas Normales</p>
                          <p className="text-2xl font-black text-[#062113]">{decimalToTime(detalleAgregadoInspector?.hNormales || 0)}</p>
                        </div>
                        <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 shadow-inner">
                          <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Horas Extras</p>
                          <p className="text-2xl font-black text-amber-700">{decimalToTime(detalleAgregadoInspector?.hExtras || 0)}</p>
                        </div>
                        <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 shadow-inner">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">H. Especiales</p>
                          <p className="text-2xl font-black text-emerald-700">{decimalToTime(detalleAgregadoInspector?.hEspeciales || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* HISTORIAL POR FECHA */}
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-[#0f172a] uppercase tracking-widest ml-4 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-[#10b981]" /> Jornadas Registradas
                  </h3>
                  <div className="space-y-3">
                      {selectedInspectorReports.map((report) => {
                        const hn = report.itinerario?.reduce((acc, s) => acc + (s.horasNormales || 0), 0) || 0;
                        const he = report.itinerario?.reduce((acc, s) => acc + (s.horasExtras || 0), 0) || 0;
                        const hs = report.itinerario?.reduce((acc, s) => acc + (s.horasEspeciales || 0), 0) || 0;
                        const totalH = hn + he + hs;
                        return (
                          <div key={report.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#10b981] transition-all">
                            <div className="flex items-center gap-6">
                               <div className="w-14 h-14 bg-[#f8fafc] rounded-2xl flex flex-col items-center justify-center border-b-2 border-slate-200 group-hover:bg-[#062113] group-hover:text-white transition-all">
                                 <span className="text-[9px] font-black uppercase opacity-60">{format(report.fecha?.toDate ? report.fecha.toDate() : new Date(report.fecha), 'EEE', { locale: es })}</span>
                                 <span className="text-lg font-black">{format(report.fecha?.toDate ? report.fecha.toDate() : new Date(report.fecha), 'dd')}</span>
                               </div>
                               <div>
                                 <p className="font-black text-sm text-[#0f172a] uppercase tracking-tight">{report.fecha?.toDate ? format(report.fecha.toDate(), 'MMMM yyyy', { locale: es }) : report.fecha}</p>
                                 {isHoursMode && (
                                   <div className="flex gap-2 mt-1">
                                     {Array.from(new Set(report.itinerario?.map(s => s.clienteNombre))).map((c, i) => (
                                       <span key={i} className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full uppercase border border-slate-100">{c as string}</span>
                                     ))}
                                   </div>
                                 )}
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-8">
                               <div className="text-right">
                                 {isHoursMode ? (
                                   <p className="text-lg font-black text-[#0f172a]">{decimalToTime(totalH || 0)} <span className="text-[10px] text-slate-300">HRS</span></p>
                                 ) : (
                                   <p className="text-lg font-black text-emerald-600">{(report.total || 0).toFixed(2)}€</p>
                                 )}
                               </div>
                               <Button
                                 onClick={() => handleDownloadPDF(report)}
                                 className="h-10 w-10 bg-slate-50 text-[#062113] rounded-xl hover:bg-[#10b981] hover:text-white transition-all shadow-inner border border-slate-100 p-0 flex items-center justify-center"
                               >
                                 <Download size={16} />
                               </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL REPORTES AVANZADOS */}
      <ReportGeneratorModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        reportes={reportesFiltrados} 
      />

      {/* MODAL EDICIÓN ADMIN */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-[2.5rem] border-none shadow-2xl p-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-4 text-slate-900 border-b pb-4 border-slate-100 flex justify-between items-center">
            <span>Corregir Registro</span>
            <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-400">{getShortName(editingReport?.inspectorNombre || '')}</span>
          </DialogTitle>
          <div className="space-y-6">
             {isHoursMode ? (
               editingReport?.itinerario?.map((s, idx) => (
                 <div key={idx} className="space-y-2 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{s.clienteNombre}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1 block">Normal</label>
                        <input 
                          type="number" step="0.1" value={s.horasNormales} 
                          onChange={e => {
                            const updated = { ...editingReport };
                            updated.itinerario![idx].horasNormales = parseFloat(e.target.value) || 0;
                            setEditingReport(updated);
                          }}
                          className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-white font-black text-slate-900 focus:border-emerald-500 transition-all outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Extra</label>
                        <input 
                          type="number" step="0.1" value={s.horasExtras} 
                          onChange={e => {
                            const updated = { ...editingReport };
                            updated.itinerario![idx].horasExtras = parseFloat(e.target.value) || 0;
                            setEditingReport(updated);
                          }}
                          className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-white font-black text-slate-900 focus:border-amber-500 transition-all outline-none text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Especial</label>
                        <input 
                          type="number" step="0.1" value={s.horasEspeciales} 
                          onChange={e => {
                            const updated = { ...editingReport };
                            updated.itinerario![idx].horasEspeciales = parseFloat(e.target.value) || 0;
                            setEditingReport(updated);
                          }}
                          className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-white font-black text-slate-900 focus:border-blue-500 transition-all outline-none text-xs"
                        />
                      </div>
                    </div>
                 </div>
               ))
             ) : (
               editingReport?.gastos?.map((g, idx) => (
                 <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 items-center">
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{g.rubro}</p>
                      <p className="text-xs font-bold text-slate-900">{g.descripcion}</p>
                    </div>
                    <div className="w-32">
                      <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Monto (€)</label>
                      <input 
                        type="number" step="0.01" value={g.monto} 
                        onChange={e => {
                          const updated = { ...editingReport };
                          updated.gastos![idx].monto = parseFloat(e.target.value) || 0;
                          updated.total = updated.gastos!.reduce((acc, curr) => acc + (curr.monto || 0), 0);
                          setEditingReport(updated);
                        }}
                        className="w-full h-10 px-3 rounded-xl border-2 border-slate-100 bg-white font-black text-emerald-600 focus:border-emerald-500 transition-all outline-none text-sm"
                      />
                    </div>
                 </div>
               ))
             )}

             <div className="pt-4 flex justify-end gap-3">
                 <Button 
                   onClick={() => setIsEditModalOpen(false)} 
                   variant="ghost" 
                   className="h-14 px-8 font-black text-[10px] uppercase border-2 border-slate-200 rounded-2xl text-slate-900 hover:bg-slate-900 hover:text-white transition-all"
                 >
                   Cancelar
                 </Button>
                <Button 
                  onClick={() => editingReport && handleUpdateReport({ ...editingReport, estado: 'Aprobado' })} 
                  className="h-14 px-8 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900 transition-all active:scale-95"
                >
                  Finalizar y Aprobar
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}