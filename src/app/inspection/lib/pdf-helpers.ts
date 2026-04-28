import jsPDF from 'jspdf';
import { headerCompletoBase64 } from '@/lib/header-base64';

/**
 * Dibuja el encabezado combinando la imagen base y texto vectorial (Altura: 25mm).
 */
export const drawPdfHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.width;

  // --- 1. Definimos las nuevas dimensiones ---
  const headerY = 0;
  const headerWidth = pageWidth;
  const headerHeight = 25; // Altura actualizada a 25mm

  const textPaddingLeft = 32;
  const contactTextPaddingRight = 10;

  // --- 2. Añadimos el fondo usando tu variable original ---
  doc.addImage(headerCompletoBase64, 'PNG', 0, headerY, headerWidth, headerHeight);

  // --- 3. Añadimos el texto vectorial nítido ---
  doc.setTextColor(255, 255, 255);

  // A) Texto de Marca (Izquierda)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  // Ajustado a +13 para centrado vertical en 25mm
  doc.text('energy engine', textPaddingLeft, headerY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  // Ajustado a +17
  doc.text('GRUPOS ELECTRÓGENOS', textPaddingLeft, headerY + 17);

  // B) Datos de Contacto (Derecha)
  doc.setFontSize(7.5);
  const rightX = pageWidth - contactTextPaddingRight;

  // Ajustados a +10, +14, +18 para mantener el bloque centrado
  doc.text('https://www.energyengine.es', rightX, headerY + 10, { align: 'right' });
  doc.text('Tel: 92 515 43 53', rightX, headerY + 14, { align: 'right' });
  doc.text('serviciotecnico@energyengine.es', rightX, headerY + 18, { align: 'right' });
};

export const drawPdfFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const verdeCorporativo = [22, 90, 48];

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });

  doc.setFillColor(verdeCorporativo[0], verdeCorporativo[1], verdeCorporativo[2]);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
};