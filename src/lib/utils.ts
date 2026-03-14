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
