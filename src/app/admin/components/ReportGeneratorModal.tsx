'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, CalendarIcon, User, Building, X } from 'lucide-react';
import { drawPdfHeader, drawPdfFooter } from '@/app/inspection/lib/pdf-helpers';

// ────────── PREMIUM DATE PICKER (FIXED CONTRAST) ──────────
function SelectDate({ date, setDate, placeholder }: { date: Date | undefined; setDate: (d: Date | undefined) => void; placeholder: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all hover:bg-slate-100 flex items-center justify-between gap-2 text-left shadow-inner">
          <span className={date ? 'text-slate-900' : 'text-slate-400'}>
            {date ? format(date, 'dd/MM/yyyy') : placeholder}
          </span>
          {date ? (
            <X size={14} className="text-slate-400 hover:text-red-400" onClick={(e) => { e.stopPropagation(); setDate(undefined); }} />
          ) : (
            <CalendarIcon size={14} className="text-slate-300" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border border-slate-200 bg-white" align="start">
        <div className="p-1 bg-white rounded-2xl">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            locale={es}
            initialFocus
            className="rounded-2xl bg-white"
            classNames={{
              day_today: "bg-slate-100 text-slate-900 font-bold",
              day_selected: "bg-slate-900 text-white hover:bg-slate-950",
              day: "text-slate-900 hover:bg-slate-100 rounded-lg w-9 h-9 font-bold",
              head_cell: "text-slate-400 font-black uppercase text-[10px] w-9",
              nav_button: "hover:bg-slate-100 rounded-lg text-slate-400"
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ReportGeneratorModal({ isOpen, onClose, reportes, fixedInspectorName }: { isOpen: boolean; onClose: () => void; reportes: any[]; fixedInspectorName?: string }) {
  const [reportType, setReportType] = useState<'inspector' | 'cliente'>(fixedInspectorName ? 'inspector' : 'inspector');
  const [selectedInspector, setSelectedInspector] = useState(fixedInspectorName || 'todos');
  const [selectedClient, setSelectedClient] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);

  const inspectors = useMemo(() => Array.from(new Set(reportes.map(r => r.inspectorNombre))).filter(Boolean).sort(), [reportes]);
  const clients = useMemo(() => Array.from(new Set(reportes.map(r => r.clienteNombre))).filter(Boolean).sort(), [reportes]);

  const getFormattedDate = (fecha: any) => {
    if (!fecha) return '—';
    const d = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return format(d, 'dd/MM/yyyy');
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const darkColor = '#062113';
    const emeraldColor = '#10b981';
    const leftMargin = 15;

    const filtered = reportes.filter(r => {
      const d = r.fecha?.toDate ? r.fecha.toDate() : new Date(r.fecha);
      let matchFecha = true;
      if (fechaDesde && fechaHasta) matchFecha = isWithinInterval(d, { start: startOfDay(fechaDesde), end: endOfDay(fechaHasta) });

      if (reportType === 'inspector') {
        const target = (fixedInspectorName || selectedInspector);
        return (target === 'todos' || r.inspectorNombre === target) && matchFecha;
      }
      return (selectedClient === 'todos' || r.clienteNombre?.toUpperCase() === selectedClient.toUpperCase()) && matchFecha;
    });

    if (filtered.length === 0) return alert("No hay registros para los criterios seleccionados.");

    filtered.sort((a, b) => {
      const da: any = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const db: any = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return da - db;
    });

    let currentY = 35;
    doc.setTextColor(darkColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`REPORTE CONSOLIDADO: ${reportType === 'inspector' ? 'INSPECTOR' : 'CLIENTE'}`, leftMargin, currentY);

    currentY += 10;

    let totalN = 0, totalE = 0, totalS = 0, totalMonto = 0;
    const hasHours = filtered.some(r => r.horaLlegada);

    filtered.forEach(r => {
      if (hasHours) {
        totalN += (r.horasNormales || 0);
        totalE += (r.horasExtras || 0);
        totalS += (r.horasEspeciales || 0);
      } else {
        totalMonto += (r.monto || 0);
      }
    });

    const totalGeneral = totalN + totalE + totalS;

    autoTable(doc, {
      startY: currentY,
      body: [
        [reportType === 'inspector' ? 'Técnico:' : 'Cliente:', (reportType === 'inspector' ? (fixedInspectorName || selectedInspector) : selectedClient).toUpperCase()],
        ['Periodo:', (fechaDesde && fechaHasta) ? `${format(fechaDesde, 'dd/MM/yyyy')} al ${format(fechaHasta, 'dd/MM/yyyy')}` : 'Todo el histórico'],
        hasHours
          ? [{ content: 'TOTAL ACUMULADO:', styles: { fontStyle: 'bold' } }, { content: `${totalGeneral.toFixed(2)}h (${totalN.toFixed(2)} Normales / ${totalE.toFixed(2)} Extras / ${totalS.toFixed(2)} Especiales)`, styles: { fontStyle: 'bold', textColor: emeraldColor } }]
          : [{ content: 'TOTAL GASTOS:', styles: { fontStyle: 'bold' } }, { content: `${totalMonto.toFixed(2)}€`, styles: { fontStyle: 'bold', textColor: emeraldColor } }]
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: '#f8fafc', cellWidth: 50 } },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: currentY,
      headStyles: { fillColor: darkColor, textColor: '#ffffff', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 3 },
      head: hasHours
        ? [['Fecha', reportType === 'inspector' ? 'Cliente' : 'Técnico', 'Actividad', 'Llegada', 'Salida', 'Normales', 'Extras', 'Especiales', 'Total']]
        : [['Fecha', 'Técnico', 'Rubro', 'Concepto', 'Pago', 'Monto']],
      body: filtered.map(r => hasHours ? [
        getFormattedDate(r.fecha),
        reportType === 'inspector' ? (r.clienteNombre || '-') : (r.inspectorNombre || '-'),
        r.actividad || '-',
        r.horaLlegada || '-',
        r.horaSalida || '-',
        (r.horasNormales || 0).toFixed(2),
        (r.horasExtras || 0).toFixed(2),
        (r.horasEspeciales || 0).toFixed(2),
        ((r.horasNormales || 0) + (r.horasExtras || 0) + (r.horasEspeciales || 0)).toFixed(2)
      ] : [
        getFormattedDate(r.fecha),
        r.inspectorNombre || '-',
        r.rubro || '-',
        r.descripcion || '-',
        r.forma_pago || '-',
        `${(r.monto || 0).toFixed(2)}€`
      ]),
      columnStyles: hasHours ? {
        5: { halign: 'center', fontStyle: 'bold' },
        6: { halign: 'center', fontStyle: 'bold' },
        7: { halign: 'center', fontStyle: 'bold' },
        8: { halign: 'center', fontStyle: 'bold', fillColor: '#f0fdf4' }
      } : {
        5: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: leftMargin, right: 15 },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawPdfHeader(doc);
      drawPdfFooter(doc, i, pageCount);
    }

    doc.save(`Reporte_Consolidado_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100">
        <DialogTitle className="text-2xl font-black uppercase tracking-tighter mb-4 text-slate-900 flex items-center gap-2 border-b pb-4 border-slate-100">
          <FileText size={24} className="text-[#10b981]" /> Generador de Reportes
        </DialogTitle>

        <div className="space-y-6">
          {!fixedInspectorName && (
            <div className="bg-slate-50 p-4 rounded-3xl flex gap-3 border border-slate-100">
              <Button onClick={() => setReportType('inspector')} className={`flex-1 h-12 rounded-2xl gap-2 font-black text-[10px] uppercase transition-all ${reportType === 'inspector' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><User size={14} /> Inspector</Button>
              <Button onClick={() => setReportType('cliente')} className={`flex-1 h-12 rounded-2xl gap-2 font-black text-[10px] uppercase transition-all ${reportType === 'cliente' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}><Building size={14} /> Cliente</Button>
            </div>
          )}

          <div className="space-y-4">
            {reportType === 'inspector' && !fixedInspectorName && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-2 text-slate-400 tracking-widest">Inspector RTS</label>
                <Select value={selectedInspector} onValueChange={setSelectedInspector}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border border-slate-200 font-bold uppercase text-xs text-slate-900 shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl border-slate-200 shadow-2xl">
                    <SelectItem value="todos" className="uppercase text-xs font-bold text-slate-400">TODOS LOS TÉCNICOS</SelectItem>
                    {inspectors.map(n => <SelectItem key={n} value={n} className="uppercase text-xs font-bold text-slate-900">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === 'cliente' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase ml-2 text-slate-400 tracking-widest">Seleccionar Cliente</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border border-slate-200 font-bold uppercase text-xs text-slate-900 shadow-inner"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white rounded-2xl border-slate-200 shadow-2xl">
                    <SelectItem value="todos" className="uppercase text-xs font-bold text-slate-400">TODOS LOS CLIENTES</SelectItem>
                    {clients.map(n => <SelectItem key={n} value={n} className="uppercase text-xs font-bold text-slate-900">{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Fecha Inicio</label><SelectDate date={fechaDesde} setDate={setFechaDesde} placeholder="Desde..." /></div>
              <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Fecha Fin</label><SelectDate date={fechaHasta} setDate={setFechaHasta} placeholder="Hasta..." /></div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-between items-center gap-3">
            <Button onClick={onClose} variant="ghost" className="h-12 px-6 rounded-xl font-black text-[10px] uppercase text-slate-400 hover:text-slate-900">Cancelar</Button>
            <Button onClick={handleGeneratePDF} className="h-12 px-8 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-95"><Download size={14} className="mr-2" /> Generar Reporte</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
