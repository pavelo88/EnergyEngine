'use client';

import { Menu } from 'lucide-react';
import { useAdminHeaderRaw } from './AdminHeaderContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { title, action } = useAdminHeaderRaw();

  return (
    <header className="flex h-24 items-center justify-between bg-transparent px-4 md:px-10 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        {/* Botón de Menú para móvil */}
        <button 
          onClick={onMenuClick} 
          className="md:hidden p-3 rounded-2xl bg-[#0b101b]/60 backdrop-blur-xl border border-white/10 text-slate-400 hover:text-white transition-all shadow-xl"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-widest uppercase italic font-headline">{title}</h1>
            <div className="h-1 w-12 bg-primary rounded-full glow-green"></div>
        </div>
      </div>
      
      {/* Botón de acción dinámico (Inyectado por cada sección) */}
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            Node: Terminal-01
        </div>
        {action && (
          <div className="animate-in fade-in zoom-in duration-500">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
