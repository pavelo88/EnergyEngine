'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut, User } from 'firebase/auth';
import { GanttChartSquare, Users, Wrench, DollarSign, LayoutDashboard, Building, Upload, LogOut, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

// Tipos para las props del componente
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
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

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const handleLogout = async () => {
    try {
      if(auth) await signOut(auth);
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

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
          'fixed inset-y-0 left-0 z-30 flex h-full w-full max-w-xs transform flex-col bg-slate-900 text-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:w-64 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header con Logo y botón de cerrar para móvil */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex flex-col leading-tight">
                <span className="font-headline text-2xl font-bold tracking-tighter text-white">energy engine</span>
                <span className="text-[9px] font-medium text-slate-400 -mt-0.5">GRUPOS ELECTROGENOS</span>
            </div>
          </Link>
          <button onClick={onClose} className="md:hidden p-1 rounded-full hover:bg-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navegación Principal */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
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
