import jsPDF from 'jspdf';
// Asumimos que guardaste la imagen completa aquí
import { headerCompletoBase64 } from '@/lib/header-base64';

/**
 * Dibuja el encabezado usando una única imagen pre-diseñada.
 */
export const drawPdfHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.width;

  // Mantenemos las coordenadas originales para que el diseño no se rompa
  const headerX = 0; // Empieza en el borde izquierdo
  const headerY = 0; // Empieza en el borde superior
  // Ancho completo de la página, altura original de 26
  const headerWidth = pageWidth;
  const headerHeight = 23;

  // Agregamos la nueva imagen completa del encabezado
  // Esto reemplaza doc.rect(), doc.addImage(logo), y todos los doc.text() anteriores.
  doc.addImage(headerCompletoBase64, 'JPEG', headerX, headerY, headerWidth, headerHeight);
};

export const drawPdfFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  // Mantenemos el color corporativo para el pie de página
  const verdeCorporativo = [22, 90, 48];

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });

  // Dibujamos la barra del pie con el color corporativo
  doc.setFillColor(verdeCorporativo[0], verdeCorporativo[1], verdeCorporativo[2]);
  doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
};