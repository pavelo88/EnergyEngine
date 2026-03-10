'use client';

import React from 'react';
import { Home, Compass, User, Power, Receipt, ClipboardList } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useScreenSize } from '@/hooks/use-screen-size';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface FooterProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function Footer({ activeTab, onNavigate }: FooterProps) {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const screenSize = useScreenSize();

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  const navItems = [
    { id: TABS.TASKS, icon: Compass, label: 'Tareas' },
    { id: TABS.NEW_INSPECTION, icon: ClipboardList, label: 'Inspección' },
    { id: TABS.EXPENSES, icon: Receipt, label: 'Jornada' },
    { id: TABS.PROFILE, icon: User, label: 'Perfil' },
  ];
  
  if (activeTab === TABS.MENU) {
    return null;
  }

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 lg:hidden">
      <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto flex justify-around items-center h-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                    "flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300",
                    isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'
                )}
              >
                <Icon size={24} />
                <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
