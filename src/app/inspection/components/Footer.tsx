'use client';

import React from 'react';
import { Compass, User, Receipt, ClipboardList, LogOut, WifiOff } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface FooterProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function Footer({ activeTab, onNavigate }: FooterProps) {
  const auth = useAuth();
  const isOnline = useOnlineStatus();

  const handleLogout = async () => {
    if (!isOnline) {
      alert("Cierre de sesión bloqueado: No hay conexión a internet.");
      return;
    }
    if (confirm("¿Cerrar sesión ahora?")) {
      await signOut(auth);
    }
  };

  const navItems = [
    { id: TABS.TASKS, icon: ClipboardList, label: 'Historial' },
    { id: TABS.EXPENSES, icon: Receipt, label: 'Gastos' },
    { id: 'logout', icon: LogOut, label: 'Salir', isLogout: true },
    { id: TABS.PROFILE, icon: User, label: 'Perfil' },
    { id: TABS.MENU, icon: Compass, label: 'Panel' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.1)]">
        <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center h-20 px-4 relative">
          {navItems.map((item) => {
            if (item.isLogout) {
              return (
                <button
                  key={item.id}
                  onClick={handleLogout}
                  className={cn(
                    "relative -top-8 w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-white transition-transform active:scale-90 z-50",
                    isOnline ? "bg-red-500 text-white shadow-red-500/40" : "bg-slate-200 text-slate-400 shadow-slate-200/40 cursor-not-allowed"
                  )}
                >
                  {isOnline ? <LogOut size={28} strokeWidth={3} /> : <WifiOff size={28} strokeWidth={3} />}
                  <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">SALIR</span>
                </button>
              );
            }

            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-14 transition-all duration-300",
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'
                )}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}