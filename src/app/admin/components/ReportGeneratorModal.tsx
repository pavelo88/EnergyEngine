'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, CalendarIcon, User, Building } from 'lucide-react';
import { drawPdfHeader, drawPdfFooter } from '@/app/inspection/lib/pdf-helpers';

export default function ReportGeneratorModal({ 
  isOpen, 
  onClose, 
  reportes 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  reportes: any[]; 
}) {
  const [reportType, setReportType] = useState<'inspector' | 'cliente'>('inspector');
  const [selectedInspector, setSelectedInspector] = useState('todos');
  const [selectedClient, setSelectedClient] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);

  // Extract unique inspectors and clients
  const inspectors = useMemo(() => {
    const list = Array.from(new Set(reportes.map(r => r.inspectorNombre))).filter(Boolean);
    return list.sort();
  }, [reportes]);

  const clients = useMemo(() => {
    const list = new Set<string>();
    reportes.forEach(r => {
      r.itinerario?.forEach((s: any) => {
        if (s.clienteNombre) list.add(s.clienteNombre.toUpperCase());
      });
    });
    return Array.from(list).sort();
  }, [reportes]);

  const handleGeneratePDF = () => {
    if (reportType === 'inspector') {
      generateInspectorReport();
    } else {
      generateClientReport();
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

  const generateInspectorReport = () => {
    if (selectedInspector === 'todos') {
      alert("Por favor seleccione un inspector específico.");
      return;
    }

    const doc = new jsPDF();
    const darkColor = '#062113';
    const emeraldColor = '#10b981';
    const leftMargin = 15;
    
    // Filter reports
    const filtered = reportes.filter(r => {
      const matchName = r.inspectorNombre === selectedInspector;
      let matchFecha = true;
      if (fechaDesde && fechaHasta) {
        const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
        matchFecha = isWithinInterval(d, { start: startOfDay(fechaDesde), end: endOfDay(fechaHasta) });
      }
      return matchName && matchFecha;
    });

    if (filtered.length === 0) {
      alert("No hay registros para este inspector en las fechas seleccionadas.");
      return;
    }

    let tNormales = 0, tExtras = 0, tEspeciales = 0;
    const body: any[] = [];

    // Sort ascending by date
    filtered.sort((a, b) => {
        const da: any = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const db: any = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return da - db;
    });

    filtered.forEach(r => {
      const dateStr = getFormattedDate(r.fecha);
      r.itinerario?.forEach((s: any) => {
        tNormales += (s.horasNormales || 0);
        tExtras += (s.horasExtras || 0);
        tEspeciales += (s.horasEspeciales || 0);
        
        body.push([
          dateStr,
          s.clienteNombre || '-',
          s.actividad || '-',
          `${(s.horasNormales || 0).toFixed(1)}h`,
          `${(s.horasExtras || 0).toFixed(1)}h`,
          `${(s.horasEspeciales || 0).toFixed(1)}h`
        ]);
      });
    });

    const totalStr = (Number(tNormales) + Number(tExtras) + Number(tEspeciales)).toFixed(1);

    // Header Info
    let currentY = 35;
    doc.setTextColor(darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSOLIDADO HORAS: INSPECTOR', leftMargin, currentY);
    
    currentY += 10;
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Técnico:', selectedInspector.toUpperCase()],
        ['Periodo:', (fechaDesde && fechaHasta) ? `${format(fechaDesde, 'dd/MM/yyyy')} al ${format(fechaHasta, 'dd/MM/yyyy')}` : 'Todo el histórico'],
        [{ content: 'Total Horas Consolidadas:', styles: { fontStyle: 'bold' } }, { content: `${totalStr} HRS`, styles: { fontStyle: 'bold', textColor: emeraldColor } }],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, lineColor: '#e2e8f0', lineWidth: 0.1 },
      headStyles: { fillColor: '#ffffff', textColor: darkColor },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f1f5f9' } },
      margin: { left: leftMargin, right: 15 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(12);
    doc.setTextColor(darkColor);
    doc.text('Detalle Operativo', leftMargin, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      headStyles: { fillColor: darkColor, textColor: '#ffffff' },
      styles: { fontSize: 8, cellPadding: 2 },
      head: [['Fecha', 'Cliente', 'Actividad', 'Normal', 'Extra', 'Esp.']],
      body: body,
      margin: { left: leftMargin, right: 15 },
    });

    // Add Pagination Header/Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, pageCount);
    }

    const n = selectedInspector.replace(/\s+/g, '_');
    doc.save(`Reporte_Inspector_${n}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const generateClientReport = () => {
    if (selectedClient === 'todos') {
      alert("Por favor seleccione un cliente específico.");
      return;
    }

    const doc = new jsPDF();
    const darkColor = '#062113';
    const emeraldColor = '#10b981';
    const leftMargin = 15;
    
    const body: any[] = [];
    let tNormales = 0, tExtras = 0, tEspeciales = 0;

    // Filter reports
    reportes.forEach(r => {
      let matchFecha = true;
      if (fechaDesde && fechaHasta) {
        const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
        matchFecha = isWithinInterval(d, { start: startOfDay(fechaDesde), end: endOfDay(fechaHasta) });
      }

      if (matchFecha && r.itinerario) {
        const dateStr = getFormattedDate(r.fecha);
        r.itinerario.forEach((s: any) => {
          if (s.clienteNombre && s.clienteNombre.toUpperCase() === selectedClient.toUpperCase()) {
            tNormales += (s.horasNormales || 0);
            tExtras += (s.horasExtras || 0);
            tEspeciales += (s.horasEspeciales || 0);
            
            body.push([
              dateStr,
              r.inspectorNombre || 'Desconocido',
              s.actividad || '-',
              `${(s.horasNormales || 0).toFixed(1)}h`,
              `${(s.horasExtras || 0).toFixed(1)}h`,
              `${(s.horasEspeciales || 0).toFixed(1)}h`
            ]);
          }
        });
      }
    });

    if (body.length === 0) {
      alert("No hay registros para este cliente en las fechas seleccionadas.");
      return;
    }

    const totalStr = (Number(tNormales) + Number(tExtras) + Number(tEspeciales)).toFixed(1);

    // Header Info
    let currentY = 35;
    doc.setTextColor(darkColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE HORAS INVERTIDAS: CLIENTE', leftMargin, currentY);
    
    currentY += 10;
    autoTable(doc, {
      startY: currentY,
      body: [
        ['Cliente / Instalación:', selectedClient.toUpperCase()],
        ['Periodo:', (fechaDesde && fechaHasta) ? `${format(fechaDesde, 'dd/MM/yyyy')} al ${format(fechaHasta, 'dd/MM/yyyy')}` : 'Todo el histórico'],
        [{ content: 'Total Horas Invertidas:', styles: { fontStyle: 'bold' } }, { content: `${totalStr} HRS`, styles: { fontStyle: 'bold', textColor: emeraldColor } }],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, lineColor: '#e2e8f0', lineWidth: 0.1 },
      headStyles: { fillColor: '#ffffff', textColor: darkColor },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f1f5f9' } },
      margin: { left: leftMargin, right: 15 },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;

    doc.setFontSize(12);
    doc.setTextColor(darkColor);
    doc.text('Desglose por Intervención Técnica', leftMargin, currentY);

    autoTable(doc, {
      startY: currentY + 5,
      headStyles: { fillColor: darkColor, textColor: '#ffffff' },
      styles: { fontSize: 8, cellPadding: 2 },
      head: [['Fecha', 'Inspector', 'Actividad', 'Normal', 'Extra', 'Esp.']],
      body: body,
      margin: { left: leftMargin, right: 15 },
    });

    // Add Pagination Header/Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, pageCount);
    }

    const n = selectedClient.replace(/\s+/g, '_');
    doc.save(`Reporte_Cliente_${n}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-[2.5rem] border-none shadow-2xl p-8">
        <DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-4 text-[#0f172a] border-b pb-4 border-slate-100 flex items-center gap-2">
          <FileText size={24} className="text-[#10b981]" />
          Generador de Reportes PDF
        </DialogTitle>
        
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex gap-4">
            <Button 
              onClick={() => setReportType('inspector')}
              className={`flex-1 h-14 rounded-2xl flex-col items-center justify-center gap-1 transition-all ${reportType === 'inspector' ? 'bg-[#062113] text-white shadow-xl' : 'bg-white text-slate-500 hover:text-slate-900 border-2 border-slate-200'}`}
            >
              <User size={18} />
              <span className="text-[10px] uppercase font-black tracking-widest">Por Inspector</span>
            </Button>
            <Button 
              onClick={() => setReportType('cliente')}
              className={`flex-1 h-14 rounded-2xl flex-col items-center justify-center gap-1 transition-all ${reportType === 'cliente' ? 'bg-[#062113] text-white shadow-xl' : 'bg-white text-slate-500 hover:text-slate-900 border-2 border-slate-200'}`}
            >
              <Building size={18} />
              <span className="text-[10px] uppercase font-black tracking-widest">Por Cliente</span>
            </Button>
          </div>

          <div className="space-y-4">
            {reportType === 'inspector' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Seleccionar Inspector</label>
                <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                  <SelectTrigger className="h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold uppercase text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="todos" className="text-xs font-bold uppercase text-slate-400" disabled>SELECCIONAR...</SelectItem>
                    {inspectors.map(name => (
                      <SelectItem key={name} value={name} className="text-xs font-bold uppercase">{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Seleccionar Cliente</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold uppercase text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white rounded-xl">
                    <SelectItem value="todos" className="text-xs font-bold uppercase text-slate-400" disabled>SELECCIONAR...</SelectItem>
                    {clients.map(name => (
                      <SelectItem key={name} value={name} className="text-xs font-bold uppercase">{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><CalendarIcon size={12} /> Fecha Inicio</label>
                <input 
                  type="date" 
                  value={fechaDesde ? format(fechaDesde, 'yyyy-MM-dd') : ''} 
                  onChange={e => setFechaDesde(e.target.value ? new Date(e.target.value) : undefined)} 
                  className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold focus:border-[#10b981] outline-none transition-colors" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 flex items-center gap-1"><CalendarIcon size={12} /> Fecha Fin</label>
                <input 
                  type="date" 
                  value={fechaHasta ? format(fechaHasta, 'yyyy-MM-dd') : ''} 
                  onChange={e => setFechaHasta(e.target.value ? new Date(e.target.value) : undefined)} 
                  className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-bold focus:border-[#10b981] outline-none transition-colors" 
                />
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 italic mt-2 px-2">Nota: Si no seleccionas fechas, se extraerá todo el histórico.</p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button onClick={onClose} variant="ghost" className="h-12 px-6 rounded-2xl font-black text-xs uppercase text-slate-500 hover:text-slate-900">Cancelar</Button>
            <Button onClick={handleGeneratePDF} className="h-12 px-6 bg-[#10b981] text-white rounded-2xl font-black text-xs uppercase hover:bg-[#062113] transition-all shadow-lg shadow-[#10b981]/20 gap-2">
              <Download size={16} /> Descargar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
