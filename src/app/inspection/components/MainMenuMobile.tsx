'use client';

import React from 'react';
import { 
  ClipboardList, Activity, Receipt, User, ArrowUpRight 
} from 'lucide-react';
import TABS from '../constants';

interface MainMenuProps {
  onNavigate: (tab: string) => void;
  userName: string;
}

const menuItems = [
  {
    id: TABS.NEW_INSPECTION,
    label: 'Inspección',
    desc: 'NUEVA REVISIÓN',
    icon: <ClipboardList size={28} />, 
    classes: 'bg-primary text-white border-primary shadow-primary/30',
    labelColor: 'text-white',
    descColor: 'text-white/70',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'VER PASADAS',
    icon: <Activity size={28} />,
    classes: 'bg-green-100 border-green-200 text-green-700 shadow-green-100',
    labelColor: 'text-green-900',
    descColor: 'text-green-700/60',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada',
    desc: 'HORAS Y GASTOS',
    icon: <Receipt size={28} />,
    classes: 'bg-slate-900 border-slate-800 text-primary shadow-slate-200',
    labelColor: 'text-white',
    descColor: 'text-slate-400',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'IDENTIDAD',
    icon: <User size={28} />,
    classes: 'bg-slate-100 border-slate-200 text-slate-600 shadow-slate-100',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
  },
];

export default function MainMenuMobile({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="w-full pt-4 pb-20 font-sans">
      <header className="mb-8 text-left px-2">
          <h2 className="text-slate-400 text-sm font-black tracking-widest uppercase">Hola, {userName}</h2>
          <h1 className="text-slate-800 text-4xl font-black mt-1 tracking-tighter font-headline">Panel de Control</h1>
      </header>

      <main className="flex flex-col gap-4"> 
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`group relative flex items-center p-6 rounded-[2rem] border-4 shadow-lg transition-all duration-200 active:scale-[0.97] ${item.classes}`}>

            <div className="p-3 rounded-2xl mr-5 transition-transform group-active:scale-110">
                {item.icon}
            </div>
            <div className="text-left">
                <h3 className={`text-xl font-black tracking-tight font-headline ${item.labelColor}`}>
                  {item.label}
                </h3>
                <p className={`text-[10px] font-black tracking-[0.2em] mt-0.5 ${item.descColor}`}>{item.desc}</p>
            </div>

            <ArrowUpRight className="absolute top-6 right-6 opacity-20" size={20} />
          </button>
        ))}
      </main>
    </div>
  );
}