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
    icon: <ClipboardList size={28} />,
    classes: 'bg-primary/10 border-primary/70 text-primary',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-primary/20',
  },
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'Consulta revisiones pasadas.',
    icon: <Activity size={28} />,
    classes: 'bg-green-600/10 border-green-600/70 text-green-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-green-600/20',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada Laboral',
    desc: 'Registro de horas y gastos.',
    icon: <Receipt size={28} />,
    classes: 'bg-slate-900 border-slate-700 text-primary',
    labelColor: 'text-white', // Texto claro para contraste
    descColor: 'text-slate-400',
    shadow: 'hover:shadow-slate-900/40',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'Ajusta tu cuenta.',
    icon: <User size={28} />,
    classes: 'bg-slate-200 border-slate-300 text-slate-600',
    labelColor: 'text-slate-800',
    descColor: 'text-slate-500',
    shadow: 'hover:shadow-slate-300/50',
  },
];

// --- COMPONENTE DE ESCRITORIO CON NUEVO DISEÑO ---
export default function MainMenuDesktop({ onNavigate, userName }: MainMenuProps) {
  return (
    <div className="min-h-full w-full bg-slate-100 flex flex-col p-8 pt-12 pb-32 font-sans">
      <div className="w-full max-w-6xl mx-auto">
        
        <header className="w-full mb-10 text-center">
            <h2 className="text-slate-500 text-lg font-bold tracking-wider uppercase">Hola, {userName}</h2>
            <h1 className="text-slate-800 text-7xl font-black mt-1 tracking-tighter">Panel de Control</h1>
        </header>

        <main className="w-full">
          <div className="grid grid-cols-4 gap-6">
            {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`group relative aspect-[4/3] flex flex-col justify-center items-center p-6 rounded-3xl border-4 shadow-lg transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98] active:shadow-inner ${item.classes} ${item.shadow}`}>
                  
                  <div className={`mb-4 transition-transform duration-200 group-active:scale-110`}>
                    {item.icon}
                  </div>

                  <div className="text-center">
                    <h3 className={`text-2xl font-bold tracking-tight ${item.labelColor}`}>
                      {item.label}
                    </h3>
                    <p className={`mt-2 text-sm font-medium ${item.descColor}`}>{item.desc}</p>
                  </div>

                  <ArrowUpRight className="absolute top-6 right-6 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            )}
          </div>
        </main>

      </div>
    </div>
  );
}
