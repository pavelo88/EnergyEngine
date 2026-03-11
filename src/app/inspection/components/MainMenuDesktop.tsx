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
    desc: 'INICIA REVISIÓN',
    icon: <ClipboardList size={36} />,
    classes: 'bg-slate-900 text-white border-slate-800 shadow-slate-900/30',
    labelColor: 'text-white',
    descColor: 'text-white/40',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'CONSULTA TRABAJOS',
    icon: <Activity size={36} />,
    classes: 'bg-primary text-white border-primary shadow-primary/30',
    labelColor: 'text-white',
    descColor: 'text-white/60',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada',
    desc: 'HORAS Y GASTOS',
    icon: <Receipt size={36} />,
    classes: 'bg-green-50 border-green-100 text-primary shadow-green-100',
    labelColor: 'text-slate-900',
    descColor: 'text-primary/60',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'ESTADO CUENTA',
    icon: <User size={36} />,
    classes: 'bg-white border-slate-100 text-slate-300 shadow-slate-50',
    labelColor: 'text-slate-900',
    descColor: 'text-slate-400',
  },
];

export default function MainMenuDesktop({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="w-full font-sans py-10">
      <header className="mb-12 text-left px-4">
          <h2 className="text-slate-400 text-sm font-black tracking-[0.3em] uppercase">Engineering Terminal</h2>
          <h1 className="text-slate-900 text-6xl font-black mt-2 tracking-tighter font-headline leading-none">Hola, {userName}</h1>
      </header>

      <main className="grid grid-cols-2 gap-8">
        {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative aspect-[1.4/1] flex flex-col justify-end items-start p-10 rounded-[3rem] border shadow-2xl transition-all duration-300 transform hover:-translate-y-2 active:scale-[0.98] ${item.classes}`}>
              
              <div className="absolute top-10 left-10 transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>

              <div className="text-left">
                <h3 className={`text-3xl font-black tracking-tight font-headline ${item.labelColor}`}>
                  {item.label}
                </h3>
                <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.2em] ${item.descColor}`}>{item.desc}</p>
              </div>

              <ArrowUpRight className="absolute top-10 right-10 opacity-20 group-hover:opacity-100 transition-opacity" size={28} />
            </button>
          )
        )}
      </main>
    </div>
  );
}
