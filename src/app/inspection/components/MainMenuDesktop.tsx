'use client';

import React from 'react';
import {
  ClipboardList, Activity, Receipt, User, ArrowUpRight,
  FileText, Settings, ClipboardCheck, Wrench, Zap, Clock, Plus
} from 'lucide-react';
import TABS from '../constants';

interface MainMenuProps {
  onNavigate: (tab: string) => void;
  onSelectInspection?: (type: string) => void;
  userName: string;
}

const navigationItems = [
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'REPORTES GENERADOS',
    icon: <ClipboardList size={28} />,
    classes: 'bg-indigo-600 border-indigo-500 shadow-indigo-600/30',
  },
  {
    id: TABS.EXPENSES,
    label: 'Jornada',
    desc: 'HORAS Y GASTOS',
    icon: <Clock size={28} />,
    classes: 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30',
  },
  {
    id: TABS.PROFILE,
    label: 'Mi Perfil',
    desc: 'ESTADO CUENTA',
    icon: <User size={28} />,
    classes: 'bg-slate-700 border-slate-600 shadow-slate-700/30',
  },
];

const quickInspections = [
  { id: 'hoja-trabajo', label: 'Hoja de Trabajo', icon: <FileText size={28} />, color: 'from-blue-600 to-blue-400' },
  { id: 'informe-tecnico', label: 'Informe Técnico', icon: <Settings size={28} />, color: 'from-indigo-600 to-indigo-400' },
  { id: 'informe-revision', label: 'Informe de Revisión', icon: <ClipboardCheck size={28} />, color: 'from-violet-600 to-violet-400' },
  { id: 'informe-simplificado', label: 'Info Simplificado', icon: <Wrench size={28} />, color: 'from-amber-600 to-amber-400' },
  // { id: 'revision-basica', label: 'Revisión Básica', icon: <Activity size={28} />, color: 'from-emerald-600 to-emerald-400' },
];

export default function MainMenuDesktop({ onNavigate, onSelectInspection, userName }: MainMenuProps) {
  return (
    <div className="w-full font-sans py-10 space-y-12">
      <header className="px-4 flex justify-between items-end">
          <div>
            <h2 className="text-slate-400 dark:text-slate-500 text-sm font-black tracking-[0.3em] uppercase">Engineering Terminal</h2>
            <h1 className="text-slate-900 text-6xl font-black mt-2 tracking-tighter leading-none">Hola, {userName}</h1>
          </div>
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/30 transform rotate-3">
              <User size={40} />
          </div>
      </header>

      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-4 flex items-center gap-3">
            <Zap size={16} className="text-primary"/> Acciones Rápidas • Inspección
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {quickInspections.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onSelectInspection?.(item.id)}
                    className="group relative flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0b101b]/60 dark:backdrop-blur-xl border border-slate-100 dark:border-white/5 rounded-[3.5rem] shadow-xl transition-all duration-300 transform hover:-translate-y-2 active:scale-[0.98] hover:border-primary/50 overflow-hidden"
                >
                    <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-2xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                        {item.icon}
                    </div>
                    <span className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter text-center">
                        {item.label}
                    </span>
                    <ArrowUpRight className="absolute top-8 right-8 text-slate-200 dark:text-white/10 group-hover:text-primary transition-colors" size={24} />
                </button>
            ))}
            {/* 
            <button
                onClick={() => onNavigate(TABS.NEW_INSPECTION)}
                className="group relative flex flex-col items-center justify-center p-10 bg-slate-900 dark:bg-primary/10 border border-slate-800 dark:border-primary/20 rounded-[3rem] shadow-2xl transition-all duration-300 transform hover:-translate-y-2 active:scale-[0.98]"
            >
                <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center text-white mb-6">
                    <Plus size={40} />
                </div>
                <span className="text-xl font-black text-white uppercase tracking-tighter">Explorar Hub</span>
                <ArrowUpRight className="absolute top-8 right-8 text-white/20" size={24} />
            </button>
            */}
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-4">Gestión Estratégica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {navigationItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-6 p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-300 hover:brightness-110 active:scale-[0.98] text-white ${item.classes}`}
                >
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                        {item.icon}
                    </div>
                    <div className="text-left">
                        <h4 className="text-2xl font-black uppercase tracking-tighter">{item.label}</h4>
                        <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">{item.desc}</p>
                    </div>
                </button>
            ))}
        </div>
      </section>
    </div>
  );
}