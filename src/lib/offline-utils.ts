export const generateReportId = (prefix: string): string => {
  const ts = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${ts}-${random}`;
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('FILE_READ_ERROR'));
    reader.readAsDataURL(file);
  });

export const base64ToBlob = (base64: string, mimeType = 'application/octet-stream'): Blob => {
  const payload = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteString = atob(payload);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
};

export const isRetryableError = (error: any): boolean => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('resource-exhausted') ||
    code.includes('network') ||
    code.includes('timeout') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('503') ||
    message.includes('429')
  );
};

export const getBackoffDelay = (retryCount: number, baseMs = 700, maxMs = 10000): number => {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, retryCount));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
};
