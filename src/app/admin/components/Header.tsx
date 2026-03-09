'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between bg-white shadow-sm px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Botón de Menú para móvil */}
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-full hover:bg-gray-100">
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </div>
      
      {/* Iconos de la derecha eliminados */}
      <div className="flex items-center gap-4">
        {/* No content */}
      </div>
    </header>
  );
}
