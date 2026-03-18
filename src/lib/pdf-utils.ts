export const getPdfFileName = (reportId?: string | null) => {
  const baseId = typeof reportId === 'string' && reportId.trim() ? reportId.trim() : 'BORRADOR';
  const safeId = baseId.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-');
  return `${safeId}.pdf`;
};

export type PdfImageFormat = 'PNG' | 'JPEG' | 'WEBP';

export const getInlineImageDataUrl = (imageValue: unknown): string | null => {
  if (typeof imageValue !== 'string') return null;
  const trimmed = imageValue.trim();
  if (!trimmed) return null;
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed) ? trimmed : null;
};

const getPdfImageFormat = (dataUrl: string): PdfImageFormat => {
  const mimeMatch = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
  const mime = (mimeMatch?.[1] || '').toLowerCase();
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('webp')) return 'WEBP';
  return 'PNG';
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });

export const resolveImageToDataUrl = async (imageValue: unknown): Promise<string | null> => {
  const inline = getInlineImageDataUrl(imageValue);
  if (inline) return inline;

  if (typeof imageValue !== 'string') return null;
  const source = imageValue.trim();
  if (!/^https?:\/\//i.test(source)) return null;

  try {
    const response = await fetch(source);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return blobToDataUrl(blob);
  } catch (error) {
    console.warn('No se pudo resolver imagen remota a data URL:', error);
    return null;
  }
};

type PdfReportLike = Record<string, any> & {
  inspectorSignatureUrl?: unknown;
  inspectorSignature?: unknown;
  clientSignatureUrl?: unknown;
  clientSignature?: unknown;
  imageUrls?: unknown[];
};

export const normalizeReportForPdf = async <T extends PdfReportLike>(report: T): Promise<T> => {
  const normalized = { ...report } as T;
  const inspectorSource = report.inspectorSignatureUrl || report.inspectorSignature || '';
  const clientSource = report.clientSignatureUrl || report.clientSignature || '';

  normalized.inspectorSignatureUrl = await resolveImageToDataUrl(inspectorSource);
  normalized.clientSignatureUrl = await resolveImageToDataUrl(clientSource);

  if (Array.isArray(report.imageUrls) && report.imageUrls.length > 0) {
    const resolved = await Promise.all(report.imageUrls.map((url: unknown) => resolveImageToDataUrl(url)));
    normalized.imageUrls = resolved.filter((item): item is string => !!item);
  }

  return normalized;
};

export const addImageSafely = (
  doc: { addImage: (imageData: string, format: PdfImageFormat, x: number, y: number, width: number, height: number) => void },
  imageValue: unknown,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const imageDataUrl = getInlineImageDataUrl(imageValue);
  if (!imageDataUrl) return false;

  try {
    doc.addImage(imageDataUrl, getPdfImageFormat(imageDataUrl), x, y, width, height);
    return true;
  } catch (error) {
    console.warn('No se pudo insertar imagen en PDF:', error);
    return false;
  }
};

export const addPngImageSafely = (
  doc: { addImage: (imageData: string, format: PdfImageFormat, x: number, y: number, width: number, height: number) => void },
  imageValue: unknown,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  return addImageSafely(doc, imageValue, x, y, width, height);
};
