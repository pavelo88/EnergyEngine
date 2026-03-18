'use client';

import React from 'react';
import { ChevronLeft, Download, Check } from 'lucide-react';
import TABS from '../constants';
import { cn } from '@/lib/utils';

interface HeaderProps {
  activeTab: string;
  isOnline: boolean;
  onBack: () => void;
  isSubNavActive: boolean;
  onInstall: () => void;
  canInstall: boolean;
  isStandalone?: boolean;
}

export default function Header({ activeTab, isOnline, onBack, isSubNavActive, onInstall, canInstall, isStandalone }: HeaderProps) {
  // El usuario solicitó que el botón de la flechita (atrás) esté siempre visible.
  const showBackButton = true;

  return (
    <header className="fixed top-0 left-0 w-full px-6 glass-carbon flex justify-between items-center z-50 h-16 border-b border-white/5">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <button 
            onClick={onBack} 
            className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95"
            aria-label="Volver"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex flex-col leading-none">
          <div className="font-headline italic tracking-tighter text-2xl font-black">
            <span className="text-white">energy</span>
            <span className="text-primary ml-1">engine</span>
          </div>
          <span className="text-[8px] font-black text-slate-400 tracking-[0.3em] uppercase -mt-0.5">INTRANET TÉCNICA</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black border transition-all duration-500",
            isOnline 
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-500/5" 
                : "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5"
        )}>
            <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
            )} />
            {isOnline ? 'CONECTADO' : 'SIN RED'}
        </div>
        {isStandalone ? (
          <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/30" title="App Descargada">
            <Check size={14} />
          </div>
        ) : (
          <button 
            onClick={onInstall} 
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-lg" 
            title="Instalar App (PWA)"
          >
            <Download size={14} />
          </button>
        )}
      </div>
    </header>
  );
}