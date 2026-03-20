'use client';

import React from 'react';
import {
  ClipboardList, Activity, Receipt, User, ArrowUpRight,
  FileText, Settings, ClipboardCheck, Wrench, Zap, Clock, Plus
} from 'lucide-react';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface MainMenuProps {
  onNavigate: (tab: string) => void;
  onSelectInspection?: (type: any, data?: any) => void;
  userName: string;
  onInstall?: () => void;
  onConfigure?: () => void;
  canInstall?: boolean;
  configStatus?: { hasSignature: boolean, hasPin: boolean };
  isOnline?: boolean;
  isStandalone?: boolean;
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
    label: 'Bitácora',
    desc: 'ITINERARIO Y CONTROL DE GASTOS',
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
  { id: 'informe-simplificado', label: 'Informe Simplificado', icon: <Wrench size={28} />, color: 'from-amber-600 to-amber-400' },
  // { id: 'revision-basica', label: 'Revisión Básica', icon: <Activity size={28} />, color: 'from-emerald-600 to-emerald-400' },
];

export default function MainMenuDesktop({
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
    <div className="w-full font-sans py-10 space-y-12">
      <header className="px-2">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-primary/20 transform -rotate-3">
            <User size={40} />
          </div>
          <div>
            <h2 className="text-slate-400 dark:text-slate-500 text-xs font-bold tracking-[0.4em] uppercase">Engineering Management System</h2>
            <h1 className="text-slate-950 dark:text-white text-5xl font-headline font-bold tracking-tighter leading-none mt-2">Bienvenido, {userName}</h1>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} className="text-primary fill-primary/20" /> Acciones Rápidas Disponibles
          </h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {quickInspections.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectInspection?.(item.id)}
              className="group relative flex flex-col items-start p-8 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-[2.5rem] transition-all duration-300 hover:scale-[1.02] hover:border-primary/50 overflow-hidden"            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-xl mb-6 transition-transform group-hover:scale-110`}>
                {item.icon}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Módulo</span>
                <span className="text-xl font-headline font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                  {item.label}
                </span>
              </div>
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6 pt-4">
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
          <Activity size={14} /> Gestión Estratégica
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-6 p-8 rounded-[3rem] border transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] text-white shadow-2xl",
                item.classes
              )}
            >
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
                {item.icon}
              </div>
              <div className="text-left">
                <h4 className="text-2xl font-headline font-black uppercase tracking-tighter leading-none">{item.label}</h4>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}