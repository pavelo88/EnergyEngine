import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSafeDate(dateValue: any, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  if (!dateValue) return 'N/A';
  
  try {
    let date: Date;
    if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else if (dateValue.seconds) { // Raw firebase timestamp
      date = new Date(dateValue.seconds * 1000);
    } else {
      return 'N/A';
    }

    if (isNaN(date.getTime())) return 'N/A';
    return format(date, formatStr);
  } catch (e) {
    return 'N/A';
  }
}

export function timeToDecimal(timeStr: string): number {
  if (!timeStr) return 0;
  if (!timeStr.includes(':')) return Number(Number(timeStr).toFixed(2)) || 0;
  const parts = timeStr.split(':');
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return Math.round((hours + (minutes / 60)) * 100) / 100;
}

export function decimalToTime(decimal: number): string {
  if (isNaN(decimal) || decimal < 0) return "00:00";
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

