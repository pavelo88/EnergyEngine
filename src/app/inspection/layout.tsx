'use client';
import { cn } from '@/lib/utils';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="flex flex-col min-h-screen">
          {children}
      </div>
    </div>
  );
}
