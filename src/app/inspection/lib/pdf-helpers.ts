import jsPDF from 'jspdf';
import { logoBase64 } from '@/lib/logo-base64';

export const drawPdfHeader = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.width;
  const leftMargin = 15;
  const rightMargin = 15;

  const logoX = leftMargin;
  const logoY = 3;
  const logoWidth = 20;
  const logoHeight = 20;
  
  doc.setFillColor(39, 180, 96);
  doc.rect(0, 0, pageWidth, 26, 'F'); 

  doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);

  const textX = logoX + logoWidth + 6;
  const textYStart = logoY + 9;

  doc.setFont('helvetica', 'bold');
  
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("energy engine", textX, textYStart);
  
  doc.setFontSize(10);
  doc.setTextColor(220, 220, 220);
  doc.text("GRUPOS ELECTRÓGENOS", textX, textYStart + 6);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220);

  const rightTextX = pageWidth - rightMargin;
  
  doc.text("https://www.energyengine.es", rightTextX, logoY + 8, { align: 'right' });
  doc.text("Tel: 92 515 43 53", rightTextX, logoY + 13, { align: 'right' });
  doc.text("serviciotecnico@energyengine.es", rightTextX, logoY + 16, { align: 'right' });
};

export const drawPdfFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const darkColor = '#0f172a';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    doc.setFillColor(darkColor);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');
};
