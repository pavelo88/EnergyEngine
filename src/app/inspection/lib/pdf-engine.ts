import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateProfessionalPDF = (type: string, data: any, tecnico: string, reportID: string) => {
  const doc = new jsPDF();
  const finalID = reportID || 'BORRADOR';

  // Header Naranja PowerSat
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.text("ENERGY ENGINE RTS", 15, 20);
  doc.setFontSize(10);
  doc.text(`REPORTE: ${type.toUpperCase()} | ID: ${finalID}`, 15, 30);
  doc.text(`TÉCNICO: ${tecnico} | FECHA: ${new Date().toLocaleDateString()}`, 130, 20);

  // Tabla ADN
  (doc as any).autoTable({
    startY: 45,
    head: [['ADN DEL GRUPO', 'DETALLE']],
    body: [
      ['CLIENTE', data.cliente.nombre],
      ['INSTALACIÓN', data.cliente.instalacion],
      ['Nº GRUPO', data.cliente.n_grupo],
      ['POTENCIA', data.cliente.potencia_kva + ' KVA'],
      ['S/N MOTOR', data.equipo.sn]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] }
  });

  // Tabla Eléctrica (RS, ST, RT, R, S, T, KW)
  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['PRUEBA ELÉCTRICA', 'VALOR']],
    body: [
      [`TENSIÓN RS / ST / RT`, `${data.pruebasCarga.rs}V / ${data.pruebasCarga.st}V / ${data.pruebasCarga.rt}V`],
      [`INTENSIDAD R / S / T`, `${data.pruebasCarga.r}A / ${data.pruebasCarga.s}A / ${data.pruebasCarga.t}A`],
      ['POTENCIA ACTIVA', `${data.pruebasCarga.kw} kW`],
      ['HORAS OPERACIÓN', `${data.mediciones.horas} H`]
    ],
    theme: 'striped'
  });

  // Notas
  const currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.text("NOTAS Y HALLAZGOS TÉCNICOS:", 15, currentY);
  doc.setFontSize(9);
  const splitText = doc.splitTextToSize(data.observaciones || "Sin observaciones.", 180);
  doc.text(splitText, 15, currentY + 8);

  // Firmas
  const footerY = doc.internal.pageSize.height - 40;
  if (data.firmaCliente) doc.addImage(data.firmaCliente, 'PNG', 130, footerY - 25, 50, 20);
  doc.line(15, footerY, 80, footerY); doc.line(130, footerY, 195, footerY);
  doc.text("FIRMA TÉCNICO", 35, footerY + 5);
  doc.text(`RECIBE: ${data.recibidoPor || 'CLIENTE'}`, 140, footerY + 5);

  doc.save(`RTS_${type}_${finalID}.pdf`);
};