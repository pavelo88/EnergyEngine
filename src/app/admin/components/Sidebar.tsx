
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signOut, User } from 'firebase/auth';
import { GanttChartSquare, Users, Wrench, DollarSign, LayoutDashboard, Building, Upload, LogOut, X, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/icons';

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
  { href: '/admin/web-requests', label: 'Solicitudes Web', icon: Mail },
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
      <div 
        className={cn(
          'fixed inset-0 bg-black/80 backdrop-blur-md z-40 md:hidden',
          isOpen ? 'block' : 'hidden'
        )}
        onClick={onClose}
      />

      <div 
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full w-[85%] transform flex-col bg-[#0b101b]/80 backdrop-blur-3xl border-r border-white/10 text-white shadow-2xl transition-all duration-500 ease-in-out md:relative md:w-24 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-24 items-center justify-center border-b border-white/5">
          <Link href="/admin" className="flex items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/10 glow-green transition-all hover:bg-white/10 overflow-hidden">
                <Logo showText={false} className="w-10 h-10 object-contain" />
            </div>
          </Link>
          <button onClick={onClose} className="absolute right-4 md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 px-3 py-10 flex flex-col items-center overflow-y-auto custom-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'relative group p-4 rounded-[1.5rem] transition-all duration-300 flex items-center justify-center',
                  isActive 
                    ? 'bg-primary text-white shadow-lg glow-green active-glow' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                )}
              >
                <link.icon className={cn("h-6 w-6 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                
                {/* Tooltip for desktop */}
                <div className="absolute left-[calc(100%+15px)] px-3 py-1.5 bg-slate-900 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 whitespace-nowrap hidden md:block">
                    {link.label}
                </div>

                {/* Mobile label */}
                <span className="md:hidden ml-4 text-sm font-bold tracking-tight">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 flex flex-col items-center gap-6 border-t border-white/5 py-8">
           {user && (
            <div className="group relative">
              <Avatar className="h-12 w-12 border-2 border-white/5 group-hover:border-primary/50 transition-colors shadow-2xl">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Avatar'} />
                <AvatarFallback className='font-black bg-slate-800 text-slate-300'>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              
              <div className="absolute left-[calc(100%+15px)] bottom-0 px-4 py-3 bg-white border border-slate-200 text-slate-800 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 min-w-[200px] hidden md:block shadow-xl">
                  <p className="text-xs font-black uppercase tracking-tighter text-slate-800">{user.displayName || 'Admin'}</p>
                  <p className="text-[9px] text-slate-500 font-bold overflow-hidden text-ellipsis">{user.email}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="p-4 rounded-2xl text-red-500/70 transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center group relative"
          >
            <LogOut className="h-6 w-6" />
            <div className="absolute left-[calc(100%+15px)] px-3 py-1.5 bg-slate-900 border border-white/10 text-[10px] font-black uppercase tracking-widest text-red-400 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 z-50 whitespace-nowrap hidden md:block">
                Cerrar Sesion
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
