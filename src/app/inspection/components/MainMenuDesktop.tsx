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
    desc: 'Inicia una nueva revisión.',
    icon: <ClipboardList size={32} />,
    classes: 'bg-primary text-white',
    labelColor: 'text-white',
    descColor: 'text-white/80',
    shadow: 'hover:shadow-primary/40',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'Consulta revisiones pasadas.',
    icon: <Activity size={32} />,
    classes: 'bg-green-100 border-green-200 text-green-700',
    labelColor: 'text-green-900',
    descColor: 'text-green-700/70',
    shadow: 'hover:shadow-green-200/50',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada Laboral',
    desc: 'Registro de horas y gastos.',
    icon: <Receipt size={32} />,
    classes: 'bg-slate-900 border-slate-800 text-primary',
    labelColor: 'text-white',
    descColor: 'text-slate-400',
    shadow: 'hover:shadow-slate-900/40',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'Ajusta tu cuenta.',
    icon: <User size={32} />,
    classes: 'bg-slate-100 border-slate-200 text-slate-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-slate-300/50',
  },
];

export default function MainMenuDesktop({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="w-full font-sans">
      <header className="mb-10 text-left px-4">
          <h2 className="text-slate-400 text-lg font-bold tracking-wider uppercase">Hola, {userName}</h2>
          <h1 className="text-slate-800 text-5xl md:text-6xl font-black mt-1 tracking-tighter font-headline">Panel de Control</h1>
      </header>

      <main className="grid grid-cols-2 gap-6 p-4">
        {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative aspect-square md:aspect-[1.2/1] flex flex-col justify-end items-start p-8 rounded-[2.5rem] border-4 shadow-xl transition-all duration-300 transform hover:-translate-y-2 active:scale-[0.98] ${item.classes} ${item.shadow}`}>
              
              <div className="absolute top-8 left-8 transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>

              <div className="text-left">
                <h3 className={`text-2xl md:text-3xl font-black tracking-tighter font-headline ${item.labelColor}`}>
                  {item.label}
                </h3>
                <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${item.descColor}`}>{item.desc}</p>
              </div>

              <ArrowUpRight className="absolute top-8 right-8 opacity-30 group-hover:opacity-100 transition-opacity" size={24} />
            </button>
          )
        )}
      </main>
    </div>
  );
}