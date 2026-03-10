'use client';

import { Menu } from 'lucide-react';
import { useAdminHeaderRaw } from './AdminHeaderContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { title, action } = useAdminHeaderRaw();

  return (
    <header className="flex h-20 items-center justify-between bg-white border-b border-slate-100 px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Botón de Menú para móvil */}
        <button 
          onClick={onMenuClick} 
          className="md:hidden p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{title}</h1>
      </div>
      
      {/* Botón de acción dinámico (Inyectado por cada sección) */}
      <div className="flex items-center gap-4">
        {action && (
          <div className="animate-in fade-in zoom-in duration-300">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}
