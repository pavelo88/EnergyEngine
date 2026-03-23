'use client';

import React from 'react';
import {
  ClipboardList, Activity, Receipt, User, ArrowUpRight,
  FileText, Settings, ClipboardCheck, Wrench, Zap, Clock, Plus
} from 'lucide-react';
import TABS from '../constants';

interface MainMenuProps {
  onNavigate: (tab: string) => void;
  onSelectInspection?: (type: any, data?: any) => void;
  userName: string;
  onInstall?: () => void;
  onConfigure?: () => void;
  canInstall?: boolean;
  configStatus?: { hasSignature: boolean };
  isOnline?: boolean;
  isStandalone?: boolean;
}

const navigationItems = [
  {
    id: TABS.TASKS,
    label: 'Historial',
    desc: 'REPORTES',
    icon: <ClipboardList size={22} />,
    color: 'bg-indigo-500',
  },
  {
    id: TABS.EXPENSES,
    label: 'Gastos',
    desc: 'GASTOS E ITINERARIO',
    icon: <Clock size={22} />,
    color: 'bg-emerald-500',
  },
  {
    id: TABS.PROFILE,
    label: 'Perfil',
    desc: 'AJUSTES',
    icon: <User size={22} />,
    color: 'bg-slate-500',
  },
];

const quickInspections = [
  { id: 'hoja-trabajo', label: 'Hoja Trabajo', icon: <FileText size={28} />, color: 'from-blue-600 to-blue-400' },
  { id: 'informe-tecnico', label: 'Inf. Técnico', icon: <Settings size={28} />, color: 'from-indigo-600 to-indigo-400' },
  { id: 'informe-revision', label: 'Inf. Revisión', icon: <ClipboardCheck size={28} />, color: 'from-violet-600 to-violet-400' },
  { id: 'informe-simplificado', label: 'Simplificado', icon: <Wrench size={28} />, color: 'from-amber-600 to-amber-400' },
  // { id: 'revision-basica', label: 'Rev. Básica', icon: <Activity size={24} />, color: 'from-emerald-600 to-emerald-400' },
];

export default function MainMenuMobile({
  onNavigate,
  onSelectInspection,
  userName,
  onInstall,
  onConfigure,
  canInstall,
  configStatus,
  isOnline,
  isStandalone
}: MainMenuProps) {
  return (
    <div className="w-full font-sans space-y-8 pb-32">
      <header className="px-2 pt-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-primary/20 transform -rotate-3">
            <User size={28} />
          </div>
          <div>
            <h2 className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">Engineering Terminal</h2>
            <h1 className="text-slate-950 dark:text-white text-3xl font-headline font-black tracking-tighter leading-none mt-1">Hola, {userName}</h1>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Zap size={12} className="text-primary fill-primary/20" /> Acciones Rápidas
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-4">
          {quickInspections.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectInspection?.(item.id)}
              className="group relative flex flex-col items-start p-6 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-[2rem] transition-all duration-300 active:scale-[0.95] hover:border-primary/50 overflow-hidden"            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-lg mb-4 transition-transform group-hover:scale-110`}>
                {item.icon}
              </div>
              <span className="text-[13px] font-bold text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                {item.label}
              </span>
              <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
            </button>
          ))}
          {/* 
            <button
                onClick={() => onNavigate(TABS.NEW_INSPECTION)}
                className="group flex flex-col items-center justify-center p-6 bg-slate-900 dark:bg-primary/20 border border-slate-800 dark:border-primary/20 rounded-[2rem] shadow-xl transition-all duration-300 active:scale-[0.95]"
            >
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-3">
                    <Plus size={24} />
                </div>
                <span className="text-[11px] font-black text-white uppercase tracking-tighter">Más Opciones</span>
            </button> 
            */}
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Gestión y Reportes</h3>
        <div className="flex flex-col gap-3">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-4 p-4 bg-white dark:bg-[#0b101b]/40 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm transition-all active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div className={`w-10 h-10 rounded-xl ${item.color} text-white flex items-center justify-center shadow-lg shadow-indigo-500/10`}>
                {item.icon}
              </div>
              <div className="flex-grow text-left">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.label}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.desc}</p>
              </div>
              <ArrowUpRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}