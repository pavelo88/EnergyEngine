'use client';

import React, { useState } from 'react';
import { Compass, User, Receipt, ClipboardList, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface FooterProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function Footer({ activeTab, onNavigate }: FooterProps) {
  const auth = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    if (!window.confirm('¿Cerrar sesión ahora? Asegúrate de haber guardado tus trabajos.')) return;

    setIsLoggingOut(true);

    try {
      // 1. Destruir toda la caché y permisos locales inmediatamente
      localStorage.removeItem('energy_engine_session_id');
      localStorage.removeItem('energy_engine_offline_email');
      localStorage.removeItem('energy_engine_inspection_mode');

      // 2. Intentar cerrar sesión en Firebase sin que bloquee la UI si no hay red
      if (auth) {
        await signOut(auth).catch((err) => {
          console.warn('Cierre de sesión local forzado (Firebase offline/error):', err);
        });
      }
    } finally {
      // 3. Forzar redirección dura. 
      // Usar window.location en lugar de router.replace evita que Next.js o la PWA se queden colgados.
      window.location.href = '/auth/inspection';
    }
  };

  // BOTÓN "SALIR" MOVIDO AL CENTRO (Índice 2 del arreglo)
  const navItems = [
    { id: TABS.MENU, icon: Compass, label: 'Panel' },
    { id: TABS.TASKS, icon: ClipboardList, label: 'Historial' },
    { id: 'logout', icon: LogOut, label: 'Salir', isLogout: true },
    { id: TABS.EXPENSES, icon: Receipt, label: 'Gastos' },
    { id: TABS.PROFILE, icon: User, label: 'Perfil' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 pb-[env(safe-area-inset-bottom)] px-4">
      {/* Fondo corporativo Deep Forest con alto contraste para asegurar visibilidad */}
      <div className="bg-[#062113] rounded-t-[2.5rem] border-t border-[#10b981]/20 shadow-[0_-10px_40px_rgba(16,185,129,0.15)]">
        <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center h-20 px-4 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            // Renderizado especial para el botón central de Salir
            if (item.isLogout) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex flex-col items-center justify-center gap-1 w-14 text-red-400 hover:text-red-500 transition-colors active:scale-90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <Loader2 size={24} className="animate-spin text-red-400" />
                  ) : (
                    <Icon size={24} strokeWidth={2} />
                  )}
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {isLoggingOut ? 'SALIENDO...' : 'SALIR'}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-14 transition-all duration-300',
                  // El texto inactivo ahora tiene más contraste para no ser "invisible"
                  isActive ? 'text-[#10b981]' : 'text-slate-300 hover:text-white transition-colors'
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