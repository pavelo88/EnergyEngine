'use client';

import React from 'react';
import {
  ClipboardList, Activity, Receipt, User, ArrowUpRight
} from 'lucide-react';
import TABS from '../constants';

interface MainMenuProps {
  onNavigate: (tab: string) => void;
  onSelectInspection?: (type: any, data?: any) => void;
  userName: string;
  onInstall?: () => void;
  onConfigure?: () => void;
  canInstall?: boolean;
  configStatus?: { hasSignature: boolean, hasPin: boolean };
  isOnline?: boolean;
}

const menuItems = [
  {
    id: TABS.NEW_INSPECTION,
    label: 'Inspección',
    desc: 'Nueva revisión.',
    icon: <ClipboardList className="w-12 h-12" />,
    classes: 'bg-primary/10 border-primary/70 text-primary',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-primary/20',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'Consultar pasadas.',
    icon: <Activity className="w-12 h-12" />,
    classes: 'bg-green-600/10 border-green-600/70 text-green-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-green-600/20',
  },
  {
    id: TABS.EXPENSES,
    label: 'Gastos',
    desc: 'Horas y gastos.',
    icon: <Receipt className="w-12 h-12" />,
    classes: 'bg-slate-900 border-slate-700 text-primary',
    labelColor: 'text-white',
    descColor: 'text-slate-400',
    shadow: 'hover:shadow-slate-900/40',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'Ajustes cuenta.',
    icon: <User className="w-12 h-12" />,
    classes: 'bg-slate-200 border-slate-300 text-slate-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-slate-300/50',
  },
];

export default function MainMenuTablet({
  onNavigate,
  userName,
  onInstall,
  onConfigure,
  canInstall,
  configStatus,
  isOnline
}: MainMenuProps) {
  return (
    <div className="h-full w-full bg-slate-100 flex flex-col p-6 pb-32 font-sans">
      <header className="w-full mb-12 text-center flex-shrink-0">
        <h2 className="text-slate-500 text-lg font-bold tracking-wider uppercase">Hola, {userName}</h2>
        <h1 className="text-slate-800 text-6xl font-black mt-1 tracking-tighter">Panel de Control</h1>
      </header>

      <main className="w-full max-w-4xl mx-auto flex-grow flex items-center justify-center">
        <div className="grid grid-cols-2 gap-12 w-full">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative aspect-video flex flex-col justify-center items-center p-10 rounded-[3rem] border-4 shadow-2xl transition-all duration-300 transform hover:-translate-y-2 active:scale-[0.98] active:shadow-inner ${item.classes} ${item.shadow}`}>

              <div className="mb-8 transition-transform duration-300 group-active:scale-110">
                <div className="transform scale-150">
                  {item.icon}
                </div>
              </div>

              <div className="text-center">
                <h3 className={`text-4xl font-black tracking-tighter ${item.labelColor}`}>
                  {item.label}
                </h3>
                <p className={`mt-3 text-sm font-black uppercase tracking-widest ${item.descColor}`}>{item.desc}</p>
              </div>

              <ArrowUpRight className="absolute top-10 right-10 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" size={32} />
            </button>
          )
          )}
        </div>
      </main>
    </div>
  );
}
