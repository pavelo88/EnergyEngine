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
    icon: <ClipboardList size={24} />, 
    classes: 'bg-primary/10 border-primary/70 text-primary',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'active:shadow-primary/20',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'Consulta revisiones pasadas.',
    icon: <Activity size={24} />,
    classes: 'bg-green-600/10 border-green-600/70 text-green-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'active:shadow-green-600/20',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada Laboral',
    desc: 'Registro de horas y gastos.',
    icon: <Receipt size={24} />,
    classes: 'bg-slate-900 border-slate-700 text-primary',
    labelColor: 'text-white',
    descColor: 'text-slate-400',
    shadow: 'active:shadow-slate-900/40',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'Ajusta tu cuenta.',
    icon: <User size={24} />,
    classes: 'bg-slate-200 border-slate-300 text-slate-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'active:shadow-slate-300/50',
  },
];

// --- COMPONENTE MÓVIL CON NUEVO DISEÑO ---
export default function MainMenuMobile({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="bg-slate-100 min-h-full px-4 pt-4 pb-32 font-sans">
      <header className="w-full mb-6 text-left">
          <h2 className="text-slate-500 text-base font-bold tracking-wider uppercase">Hola, {userName}</h2>
          <h1 className="text-slate-800 text-4xl font-black mt-1 tracking-tighter">Panel de Control</h1>
      </header>

      <main className="w-full">
        <div className="flex flex-col gap-3"> 
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex items-center p-4 rounded-2xl border-4 shadow-lg shadow-slate-200 transition-all duration-200 active:scale-[0.98] active:shadow-inner ${item.classes} ${item.shadow}`}>

              <div className={`p-2.5 rounded-lg mr-4 transition-transform duration-200 group-active:scale-110`}>
                  {item.icon}
              </div>
              <div className="text-left">
                  <h3 className={`text-lg font-bold tracking-tight ${item.labelColor}`}>
                    {item.label}
                  </h3>
                  <p className={`mt-0.5 text-xs font-medium ${item.descColor}`}>{item.desc}</p>
              </div>

              <ArrowUpRight className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
