'use client';

import Link from 'next/link';
<<<<<<< HEAD
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut, User } from 'firebase/auth';
import { GanttChartSquare, Users, Wrench, DollarSign, LayoutDashboard, Building, Upload, LogOut, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
=======
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { GanttChartSquare, Users, Wrench, DollarSign, LayoutDashboard, Building, Upload, LogOut, X } from 'lucide-react';

>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

// Tipos para las props del componente
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
<<<<<<< HEAD
  user: User | null;
=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
}

const navLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/clients', label: 'Clientes', icon: Building },
  { href: '/admin/jobs', label: 'Trabajos', icon: Wrench },
  { href: '/admin/expenses', label: 'Gastos', icon: DollarSign },
  { href: '/admin/reports', label: 'Informes', icon: GanttChartSquare },
  { href: '/admin/import', label: 'Importar', icon: Upload },
];

<<<<<<< HEAD
export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
=======
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    try {
<<<<<<< HEAD
      if(auth) await signOut(auth);
=======
      await signOut(auth); // Use the imported auth instance
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

<<<<<<< HEAD
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

=======
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
  return (
    <>
      {/* Overlay for mobile, to close sidebar on click outside */}
      <div 
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden',
          isOpen ? 'block' : 'hidden'
        )}
        onClick={onClose}
      />

      <div 
        className={cn(
<<<<<<< HEAD
          'fixed inset-y-0 left-0 z-30 flex h-full w-full transform flex-col bg-slate-900 text-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:w-64 md:translate-x-0',
=======
          'fixed inset-y-0 left-0 z-30 flex h-full w-64 transform flex-col bg-slate-900/80 text-white shadow-lg backdrop-blur-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header con Logo y botón de cerrar para móvil */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-gray-800">
<<<<<<< HEAD
          <Link href="/admin" className="flex items-center gap-3">
            <Logo />
=======
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-lg">Panel</span>
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
          </Link>
          <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navegación Principal */}
<<<<<<< HEAD
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
=======
        <nav className="flex-1 space-y-2 px-4 py-6">
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose} // Cierra el menú en móvil al hacer clic en un enlace
                className={cn(
                  'flex items-center gap-4 rounded-lg px-4 py-2.5 text-base font-medium text-gray-300 transition-all duration-200 hover:bg-gray-700 hover:text-white',
                  isActive && 'bg-primary text-white shadow-md'
                )}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

<<<<<<< HEAD
        {/* Footer del Sidebar con info de usuario y botón de logout */}
        <div className="border-t border-gray-800 p-4">
           {user && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Avatar'} />
                <AvatarFallback className='font-bold bg-slate-700 text-slate-300'>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-white">{user.displayName || 'Admin'}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
          )}
=======
        {/* Footer del Sidebar con botón de logout */}
        <div className="border-t border-gray-800 p-4">
>>>>>>> e0014d8f0ee0f6838d7f87815a7749f3ae0431de
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-lg px-4 py-2.5 text-base font-medium text-red-400 transition-all duration-200 hover:bg-red-900/50 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
