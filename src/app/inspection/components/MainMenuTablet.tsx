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
    icon: <ClipboardList className="w-1/3 h-1/3" />,
    classes: 'bg-primary/10 border-primary/70 text-primary',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-primary/20',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'Consulta revisiones pasadas.',
    icon: <Activity className="w-1/3 h-1/3" />,
    classes: 'bg-green-600/10 border-green-600/70 text-green-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-green-600/20',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada Laboral',
    desc: 'Registro de horas y gastos.',
    icon: <Receipt className="w-1/3 h-1/3" />,
    classes: 'bg-slate-900 border-slate-700 text-primary',
    labelColor: 'text-white',
    descColor: 'text-slate-400',
    shadow: 'hover:shadow-slate-900/40',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'Ajusta tu cuenta.',
    icon: <User className="w-1/3 h-1/3" />,
    classes: 'bg-slate-200 border-slate-300 text-slate-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-slate-300/50',
  },
];

// --- VISTA TABLET CON NUEVO DISEÑO Y FUENTES MÁS GRANDES ---
export default function MainMenuTablet({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="h-full w-full bg-slate-100 flex flex-col p-6 pb-32 font-sans">
      <header className="w-full mb-8 text-center flex-shrink-0">
          <h2 className="text-slate-500 text-lg font-bold tracking-wider uppercase">Hola, {userName}</h2>
          <h1 className="text-slate-800 text-7xl font-black mt-1 tracking-tighter">Panel de Control</h1>
      </header>

      <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col">
        <div className="w-full grid grid-cols-2 gap-8 flex-grow">
          {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group relative aspect-square flex flex-col justify-center items-center p-6 rounded-3xl border-4 shadow-xl transition-all duration-200 transform hover:-translate-y-2 active:scale-[0.98] active:shadow-inner ${item.classes} ${item.shadow}`}>
                
                <div className={`flex-grow w-full flex items-center justify-center transition-transform duration-200 group-active:scale-110`}>
                  {item.icon}
                </div>

                <div className="text-center flex-shrink-0">
                  <h3 className={`text-4xl font-bold tracking-tight ${item.labelColor}`}>
                    {item.label}
                  </h3>
                  <p className={`mt-2 text-xl font-medium ${item.descColor}`}>{item.desc}</p>
                </div>

                <ArrowUpRight className="absolute top-6 right-6 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
