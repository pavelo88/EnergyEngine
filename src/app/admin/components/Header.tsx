'use client';

import { Menu } from 'lucide-react';
import { useAdminHeaderRaw } from './AdminHeaderContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { title, action } = useAdminHeaderRaw();

  return (
    <header className="flex h-24 items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-10 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-6">
        <button 
          onClick={onMenuClick} 
          className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-[#062113] hover:bg-white transition-all shadow-sm"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="space-y-1">
            <h1 className="text-2xl font-black text-[#0f172a] tracking-widest uppercase italic font-headline">{title}</h1>
            <div className="h-1 w-12 bg-[#10b981] rounded-full"></div>
        </div>
      </div>
      
      {/* Botón de acción dinámico (Inyectado por cada sección) */}
      <div className="flex items-center gap-6">
        {action && (
          <div className="animate-in fade-in zoom-in duration-500">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
