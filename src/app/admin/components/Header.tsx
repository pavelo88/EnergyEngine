'use client';

<<<<<<< HEAD
import { Menu } from 'lucide-react';
=======
import { Menu, Bell, UserCircle } from 'lucide-react';
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

<<<<<<< HEAD
export default function Header({ onMenuClick }: HeaderProps) {
=======
export default function Header({ onMenuClick, title }: HeaderProps) {
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  return (
    <header className="flex h-16 items-center justify-between bg-white shadow-sm px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {/* Botón de Menú para móvil */}
        <button onClick={onMenuClick} className="md:hidden p-2 rounded-full hover:bg-gray-100">
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
<<<<<<< HEAD
      </div>
      
      {/* Iconos de la derecha eliminados */}
      <div className="flex items-center gap-4">
        {/* No content */}
=======
        <h1 className="text-xl font-semibold text-gray-800 hidden md:block">{title}</h1>
      </div>
      
      {/* Iconos de la derecha (ejemplo) */}
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Bell className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <UserCircle className="h-6 w-6 text-gray-600" />
        </button>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      </div>
    </header>
  );
}
