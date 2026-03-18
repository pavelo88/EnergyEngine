import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { drawPdfHeader, drawPdfFooter } from './pdf-helpers';

/**
 * Genera un PDF robusto que no se rompe si faltan datos técnicos.
 * @param data Objeto con la información del informe (formData)
 * @param tecnico Nombre del inspector
 * @param reportID ID del informe (ej: HT-PG-0002)
 */
export const generatePDF = (data: any, tecnico: string, reportID: string) => {
  const doc = new jsPDF();
  
  // Dibujar encabezado profesional (PowerSat / Energy Engine)
  drawPdfHeader(doc);

  const finalID = reportID || 'BORRADOR';
  const marginX = 15;
  let currentY = 35;

  // --- TÍTULO Y DATOS BÁSICOS ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`HOJA DE TRABAJO: ${finalID}`, marginX, currentY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  currentY += 6;
  doc.text(`Cliente: ${data.clienteNombre || data.clienteId || 'No asignado'}`, marginX, currentY);
  doc.text(`Fecha: ${data.fecha || new Date().toLocaleDateString()}`, 150, currentY);
  currentY += 5;
  doc.text(`Instalación: ${data.instalacion || '-'}`, marginX, currentY);
  doc.text(`Técnico: ${tecnico || 'No especificado'}`, 150, currentY);

  // --- TABLA 1: PARÁMETROS TÉCNICOS (PROTEGIDA) ---
  // Extraemos los objetos o creamos unos vacíos para que no den error .map o .prop
  const p = data.parametrosTecnicos || {};
  
  (doc as any).autoTable({
    startY: currentY + 10,
    margin: { left: marginX },
    head: [['PARÁMETRO TÉCNICO', 'VALOR MEDIDO']],
    body: [
      ['Presión de Aceite', (p.presionAceite || '-') + ' Bar'],
      ['Temperatura', (p.temperatura || '-') + ' ºC'],
      ['Tensión de Baterías', (p.tensionBaterias || '-') + ' Vdc'],
      ['Frecuencia', (p.frecuencia || '-') + ' Hz'],
      ['Horas de Operación', (p.horas || '0') + ' H'],
      ['Nivel de Combustible', (p.nivelCombustible || '-') + ' %']
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 180, 96], textColor: [255, 255, 255] },
    styles: { fontSize: 8 }
  });

  // --- TABLA 2: PRUEBA CON CARGA (PROTEGIDA) ---
  const c = data.potenciaConCarga || {};
  const lastY = (doc as any).lastAutoTable.finalY;

  (doc as any).autoTable({
    startY: lastY + 10,
    margin: { left: marginX },
    head: [['PRUEBA ELÉCTRICA CON CARGA', 'VALOR']],
    body: [
      ['Tensión RS / ST / RT', `${c.tensionRS || '-'}V / ${c.tensionST || '-'}V / ${c.tensionRT || '-'}V`],
      ['Intensidad R / S / T', `${c.intensidadR || '-'}A / ${c.intensidadS || '-'}A / ${c.intensidadT || '-'}A`],
      ['Potencia Activa', (c.potenciaKW || '-') + ' kW'],
      ['Potencia Aparente', (c.potencia || '-') + ' kVA']
    ],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    styles: { fontSize: 8 }
  });

  // --- TRABAJOS REALIZADOS ---
  const trabajosY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.text("TRABAJOS REALIZADOS / OBSERVACIONES:", marginX, trabajosY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitObservaciones = doc.splitTextToSize(data.trabajos_realizados || "No se registraron observaciones adicionales.", 180);
  doc.text(splitObservaciones, marginX, trabajosY + 7);

  // --- FIRMAS (PROTEGIDAS) ---
  // Solo intentamos dibujar la firma si existe el string Base64 o URL
  const finalY = trabajosY + 40;
  
  if (data.inspectorSignatureUrl) {
    try {
      doc.addImage(data.inspectorSignatureUrl, 'PNG', 20, finalY, 50, 25);
      doc.line(20, finalY + 26, 70, finalY + 26);
      doc.text("Firma Inspector", 35, finalY + 31);
    } catch (e) { console.warn("No se pudo cargar firma inspector"); }
  }

  if (data.clientSignatureUrl) {
    try {
      doc.addImage(data.clientSignatureUrl, 'PNG', 130, finalY, 50, 25);
      doc.line(130, finalY + 26, 180, finalY + 26);
      doc.text(data.clienteNombre || "Firma Cliente", 145, finalY + 31);
    } catch (e) { console.warn("No se pudo cargar firma cliente"); }
  }

  // Dibujar Pie de página
// --- DIBUJAR PIE DE PÁGINA CORRECTAMENTE ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPdfFooter(doc, i, totalPages);
  }
  
  return doc;
};