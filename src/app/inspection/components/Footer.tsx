'use client';

import React from 'react';
import { Compass, User, Receipt, ClipboardList, Plus } from 'lucide-react';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface FooterProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export default function Footer({ activeTab, onNavigate }: FooterProps) {
  const navItems = [
    { id: TABS.TASKS, icon: ClipboardList, label: 'Historial' },
    { id: TABS.EXPENSES, icon: Receipt, label: 'Jornada' },
    { id: 'fab', icon: Plus, label: 'Nuevo', isFab: true },
    { id: TABS.PROFILE, icon: User, label: 'Perfil' },
    { id: TABS.MENU, icon: Compass, label: 'Panel' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.1)]">
        <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center h-20 px-4 relative">
          {navItems.map((item) => {
            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(TABS.NEW_INSPECTION)}
                  className="relative -top-8 w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white dark:border-slate-900 transition-transform active:scale-90 hover:scale-105 z-50"
                >
                  <Plus size={32} strokeWidth={3} />
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