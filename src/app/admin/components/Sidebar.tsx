
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
          'fixed inset-y-0 left-0 z-50 flex h-full w-[85%] transform flex-col bg-[#0b101b]/80 backdrop-blur-3xl border-r border-white/10 text-white shadow-2xl transition-all duration-500 ease-in-out md:relative md:w-64 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-24 items-center px-6 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center p-2 border border-white/10 glow-green transition-all hover:bg-white/10 overflow-hidden shrink-0">
                <Logo showText={false} className="w-8 h-8 object-contain" />
            </div>
            <div className="hidden md:block overflow-hidden">
                <h1 className="text-sm font-black tracking-tighter leading-none text-white whitespace-nowrap">ENERGY</h1>
                <p className="text-[10px] font-bold tracking-[0.3em] text-primary whitespace-nowrap">ENGINE</p>
            </div>
          </Link>
          <button onClick={onClose} className="absolute right-4 md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-8 flex flex-col items-stretch overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'relative group px-4 py-3 rounded-2xl transition-all duration-300 flex items-center gap-4',
                  isActive 
                    ? 'bg-primary text-white shadow-lg glow-green active-glow' 
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                )}
              >
                <link.icon className={cn("h-5 w-5 transition-transform duration-300 shrink-0", isActive ? "scale-110" : "group-hover:scale-110")} />
                <span className="text-xs font-black uppercase tracking-widest">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 flex flex-col gap-4 border-t border-white/5 py-8">
           {user && (
            <div className="flex items-center gap-4 px-2">
              <Avatar className="h-10 w-10 border-2 border-white/5 shadow-2xl shrink-0">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Avatar'} />
                <AvatarFallback className='font-black bg-slate-800 text-slate-300 text-xs'>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block overflow-hidden">
                  <p className="text-[10px] font-black uppercase tracking-tighter text-white truncate">{user.displayName || 'Admin'}</p>
                  <p className="text-[8px] text-slate-500 font-bold truncate">{user.email}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="px-4 py-3 rounded-2xl text-red-500/70 transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-4 group"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
